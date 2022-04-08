import fsSync, { promises as fs } from "fs"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  GitTreeObject,
  AnalyzerData,
  AnalyzerDataInterfaceVersion,
  TruckUserConfig,
} from "./model"
import { log, setLogLevel } from "./log.server"
import { describeAsyncJob, formatMs, writeRepoToFile, getDirName } from "./util.server"
import { GitCaller } from "./git-caller"
import { emptyGitCommitHash } from "./constants"
import { resolve, isAbsolute, join } from "path"
import { performance } from "perf_hooks"
import { getAuthorSet, hydrateData } from "./hydrate.server"
import {} from "@remix-run/node"
import { getArgs } from "./args.server"
import ignore from "ignore"
import { applyIgnore, applyMetrics, initMetrics, TreeCleanup } from "./postprocessing.server"
import latestVersion from "latest-version"
import pkg from "../../package.json"
import { getCoAuthors } from "./coauthors.server"
import { exec } from "child_process"

let repoDir = "."

export async function findBranchHead(repo: string, branch: string | null) {
  if (branch === null) branch = await GitCaller.getInstance().getCurrentBranch(repo)

  const gitFolder = join(repo, ".git")
  if (!fsSync.existsSync(gitFolder)) {
    throw Error(`${repo} is not a git repository`)
  }
  // Find file containing the branch head
  const branchPath = join(gitFolder, "refs/heads/" + branch)
  const absolutePath = join(process.cwd(), branchPath)
  log.debug("Looking for branch head at " + absolutePath)

  const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()
  log.debug(`${branch} -> [commit]${branchHead}`)
  if (!branchHead) throw Error("Branch head not found")

  return [branchHead, branch]
}

export async function analyzeCommitLight(hash: string): Promise<GitCommitObjectLight> {
  const rawContent = await GitCaller.getInstance().catFileCached(hash)
  const commitRegex =
    /tree (?<tree>.*)\s*(?:parent (?<parent>.*)\s*)?(?:parent (?<parent2>.*)\s*)?author (?<authorName>.*?) <(?<authorEmail>.*?)> (?<authorTimeStamp>\d*?) (?<authorTimeZone>.*?)\s*committer (?<committerName>.*?) <(?<committerEmail>.*?)> (?<committerTimeStamp>\d*?) (?<committerTimeZone>.*)\s*(?:gpgsig (?:.|\s)*?-----END PGP SIGNATURE-----)?\s*(?<message>.*)\s*(?<description>(?:.|\s)*)/gm

  const match = commitRegex.exec(rawContent)
  const groups = match?.groups ?? {}

  const tree = groups["tree"]
  const parent = groups["parent"] ?? emptyGitCommitHash
  const parent2 = groups["parent2"] ?? null
  const author = {
    name: groups["authorName"],
    email: groups["authorEmail"],
    timestamp: Number(groups["authorTimeStamp"]),
    timezone: groups["authorTimeZone"],
  }
  const committer = {
    name: groups["committerName"],
    email: groups["committerEmail"],
    timestamp: Number(groups["committerTimeStamp"]),
    timezone: groups["committerTimeZone"],
  }
  const message = groups["message"]
  const description = groups["description"]
  const coauthors = description ? getCoAuthors(description) : []

  return {
    type: "commit",
    hash,
    tree,
    parent,
    parent2,
    author,
    committer,
    message,
    description,
    coauthors,
  }
}

export async function analyzeCommit(repoName: string, hash: string): Promise<GitCommitObject> {
  if (hash === undefined) {
    throw Error("Hash is required")
  }
  const { tree, ...commit } = await analyzeCommitLight(hash)
  const commitObject = {
    ...commit,
    tree: await analyzeTree(repoName, repoName, tree),
  }
  return commitObject
}

async function analyzeTree(path: string, name: string, hash: string): Promise<GitTreeObject> {
  const rawContent = await GitCaller.getInstance().catFileCached(hash)
  const entries = rawContent.split("\n").filter((x) => x.trim().length > 0)

  const children: (GitTreeObject | GitBlobObject)[] = []
  for await (const line of entries) {
    const catFileRegex = /^.+?\s(?<type>\w+)\s(?<hash>.+?)\s+(?<name>.+?)\s*$/g
    const groups = catFileRegex.exec(line)?.groups ?? {}

    const type = groups["type"]
    const hash = groups["hash"]
    const name = groups["name"]

    const newPath = [path, name].join("/")
    log.debug(`Path: ${newPath}`)

    switch (type) {
      case "tree":
        children.push(await analyzeTree(newPath, name, hash))
        break
      case "blob":
        children.push({
          type: "blob",
          hash,
          path: newPath,
          name,
          content: await GitCaller.getInstance().catFileCached(hash),
          blameAuthors: await GitCaller.getInstance().parseBlame(newPath),
        })
        break
      default:
        throw new Error(` type ${type}`)
    }
  }

  return {
    type: "tree",
    path,
    name,
    hash,
    children,
  }
}

function getCommandLine() {
  switch (process.platform) {
    case "darwin":
      return "open" // MacOS
    case "win32":
      return "start" // Windows
    default:
      return "xdg-open" // Linux
  }
}

export function openFile(path: string) {
  path = path.split("/").slice(1).join("/") ?? path.split("\\").slice(1).join("\\")
  exec(`${getCommandLine()} ${resolve(repoDir, path)}`).stderr?.on("data", (e) => {
    // TODO show error in UI
    log.error(`Cannot open file ${resolve(repoDir, path)}: ${e}`)
  })
}

export async function updateTruckConfig(repoDir: string, updaterFn: (tc: TruckUserConfig) => TruckUserConfig) {
  const truckConfigPath = resolve(repoDir, "truckconfig.json")
  let currentConfig: TruckUserConfig = {}
  try {
    const configFileContents = await fs.readFile(truckConfigPath, "utf-8")
    if (configFileContents) currentConfig = JSON.parse(configFileContents)
  } catch (e) {}
  const updatedConfig = updaterFn(currentConfig)
  await fs.writeFile(truckConfigPath, JSON.stringify(updatedConfig, null, 2))
}

export async function analyze(useCache = true) {
  const args = await getArgs()
  GitCaller.initInstance(args.path)

  if (args?.log) {
    setLogLevel(args.log as string)
  }

  repoDir = args.path
  if (!isAbsolute(repoDir)) repoDir = resolve(process.cwd(), repoDir)

  const branch = args.branch

  const hiddenFiles = args.hiddenFiles

  const start = performance.now()
  const [branchHead, branchName] = await describeAsyncJob(
    () => findBranchHead(repoDir, branch),
    "Finding branch head",
    "Found branch head",
    "Error finding branch head"
  )
  const repoName = getRepoName(repoDir)

  let data: AnalyzerData | null = null

  const dataPath = getOutPathFromRepoAndBranch(repoName, branchName)
  if (fsSync.existsSync(dataPath)) {
    const path = getOutPathFromRepoAndBranch(repoName, branchName)
    const cachedData = JSON.parse(await fs.readFile(path, "utf8")) as AnalyzerData

    // Check if the current branchHead matches the hash of the analyzed commit from the cache
    const branchHeadMatches = branchHead === cachedData.commit.hash

    // Check if the data uses the most recent analyzer data interface
    const dataVersionMatches = cachedData.interfaceVersion === AnalyzerDataInterfaceVersion

    const cacheConditions = {
      branchHeadMatches,
      dataVersionMatches,
      refresh: !useCache,
    }

    // Only return cached data if every criteria is met
    if (Object.values(cacheConditions).every(Boolean)) {
      data = {
        ...cachedData,
        hiddenFiles,
      }
    } else {
      const reasons = Object.entries(cacheConditions)
        .filter(([, value]) => !value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      log.info(`Reanalyzing, since the following cache conditions were not met: ${reasons}`)
    }
  }

  if (data === null) {
    const quotePathDefaultValue = await GitCaller.getInstance().getDefaultGitSettingValue(repoDir, "core.quotepath")
    await GitCaller.getInstance().setGitSetting(repoDir, "core.quotePath", "off")
    const renamesDefaultValue = await GitCaller.getInstance().getDefaultGitSettingValue(repoDir, "diff.renames")
    await GitCaller.getInstance().setGitSetting(repoDir, "diff.renames", "true")
    const renameLimitDefaultValue = await GitCaller.getInstance().getDefaultGitSettingValue(repoDir, "diff.renameLimit")
    await GitCaller.getInstance().setGitSetting(repoDir, "diff.renameLimit", "1000000")
    const hasUnstagedChanges = await GitCaller.getInstance().hasUnstagedChanges()

    const runDateEpoch = Date.now()
    const repoTree = await describeAsyncJob(
      () => analyzeCommit(repoName, branchHead),
      "Analyzing commit tree",
      "Commit tree analyzed",
      "Error analyzing commit tree"
    )

    const hydratedRepoTree = await describeAsyncJob(
      () => hydrateData(repoDir, repoTree),
      "Hydrating commit tree",
      "Commit tree hydrated",
      "Error hydrating commit tree"
    )

    await GitCaller.getInstance().resetGitSetting(repoDir, "core.quotepath", quotePathDefaultValue)
    await GitCaller.getInstance().resetGitSetting(repoDir, "diff.renames", renamesDefaultValue)
    await GitCaller.getInstance().resetGitSetting(repoDir, "diff.renameLimit", renameLimitDefaultValue)

    const defaultOutPath = getOutPathFromRepoAndBranch(repoName, branchName)
    let outPath = resolve((args.out as string) ?? defaultOutPath)
    if (!isAbsolute(outPath)) outPath = resolve(process.cwd(), outPath)

    let latestV: string | undefined

    try {
      latestV = await latestVersion(pkg.name)
    } catch {}

    const authorUnions = args.unionedAuthors as string[][]
    data = {
      cached: false,
      hiddenFiles,
      authors: getAuthorSet(),
      repo: repoName,
      branch: branchName,
      commit: hydratedRepoTree,
      authorUnions: authorUnions,
      interfaceVersion: AnalyzerDataInterfaceVersion,
      currentVersion: pkg.version,
      latestVersion: latestV,
      lastRunEpoch: runDateEpoch,
      hasUnstagedChanges,
    }

    await describeAsyncJob(
      () =>
        writeRepoToFile(outPath, {
          ...data,
          cached: true,
        } as AnalyzerData),
      "Writing data to file",
      `Wrote data to ${resolve(outPath)}`,
      `Error writing data to file ${outPath}`
    )
  }

  const truckignore = ignore().add(hiddenFiles)
  data.commit.tree = applyIgnore(data.commit.tree, truckignore)
  TreeCleanup(data.commit.tree)
  initMetrics(data)
  data.commit.tree = applyMetrics(data, data.commit.tree)

  const stop = performance.now()

  log.raw(`\nDone in ${formatMs(stop - start)}`)

  return data
}

export function getOutPathFromRepoAndBranch(repoName: string, branchName: string) {
  return resolve(__dirname, "..", ".temp", repoName, `${branchName}.json`)
}
