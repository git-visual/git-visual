import c from "ansi-colors"
import { createSpinner } from "nanospinner"
import { exec, spawn } from "node:child_process"
import { readdir } from "node:fs/promises"
import { join, resolve as resolvePath, sep } from "node:path"
import { performance } from "node:perf_hooks"
import invariant from "tiny-invariant"
import { getLogLevel, log, LOG_LEVEL } from "./log.server"
import type { GitObject, GitTreeObject, RenameEntry, Repository } from "./model"
import { existsSync } from "node:fs"
import ServerInstance from "./ServerInstance.server"

export function last<T>(array: T[]) {
  return array[array.length - 1]
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function runProcess(
  dir: string,
  command: string,
  args: string[],
  serverInstance?: ServerInstance,
  index?: number
) {
  log.debug(`exec ${dir} $ ${command} ${args.join(" ")}`)
  return new Promise((resolve, reject) => {
    try {
      const prcs = spawn(command, args, {
        cwd: resolvePath(dir)
      })
      const chunks: Uint8Array[] = []
      const errorHandler = (buf: Error): void => reject(buf.toString().trim())
      prcs.once("error", errorHandler)
      prcs.stderr.once("data", errorHandler)
      prcs.stdout.on("data", (buf) => {
        chunks.push(buf)
        if (serverInstance && index !== undefined) serverInstance.updateProgress(index)
      })
      prcs.stdout.on("end", () => {
        resolve(Buffer.concat(chunks).toString().trim())
      })
    } catch (e) {
      log.error(e as Error)
      reject(e)
    }
  })
}

function getWeek(date: Date): number {
  const tempDate = new Date(date)
  tempDate.setHours(0, 0, 0, 0)
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7))
  const yearStart = new Date(tempDate.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return weekNo
}

export function getTimeIntervals(timeUnit: string, minTime: number, maxTime: number): [string, number][] {
  const intervals: [string, number][] = []

  const startDate = new Date(minTime * 1000)
  const endDate = new Date(maxTime * 1000)

  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const currTime = currentDate.getTime() / 1000
    if (timeUnit === "week") {
      const weekNum = getWeek(currentDate)
      intervals.push([`Week ${weekNum < 10 ? "0" : ""}${weekNum} ${currentDate.getFullYear()}`, currTime])
      currentDate.setDate(currentDate.getDate() + 7)
    } else if (timeUnit === "year") {
      intervals.push([currentDate.getFullYear().toString(), currTime])
      currentDate.setFullYear(currentDate.getFullYear() + 1)
    } else if (timeUnit === "month") {
      intervals.push([currentDate.toLocaleString("en-gb", { month: "long", year: "numeric" }), currTime])
      currentDate.setMonth(currentDate.getMonth() + 1)
    } else if (timeUnit === "day") {
      intervals.push([
        currentDate
          .toLocaleDateString("en-gb", { day: "numeric", month: "long", year: "numeric", weekday: "short" })
          .replace(",", ""),
        currTime
      ])
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  return intervals
}

export function analyzeRenamedFile(
  file: string,
  timestamp: number,
  authortime: number,
  renamedFiles: RenameEntry[],
  repo: string
) {
  const movedFileRegex = /(?:.*{(?<oldPath>.*)\s=>\s(?<newPath>.*)}.*)|(?:^(?<oldPath2>.*) => (?<newPath2>.*))$/gm
  const replaceRegex = /{.*}/gm
  const match = movedFileRegex.exec(file)
  const groups = match?.groups ?? {}
  let oldPath: string
  let newPath: string

  if (groups["oldPath"] || groups["newPath"]) {
    const oldP = groups["oldPath"] ?? ""
    const newP = groups["newPath"] ?? ""
    oldPath = repo + "/" + file.replace(replaceRegex, oldP).replace("//", "/")
    newPath = repo + "/" + file.replace(replaceRegex, newP).replace("//", "/")
  } else {
    oldPath = repo + "/" + (groups["oldPath2"] ?? "")
    newPath = repo + "/" + (groups["newPath2"] ?? "")
  }

  renamedFiles.push({ fromname: oldPath, toname: newPath, timestamp: timestamp, timestampauthor: authortime })
  return newPath
}

export function lookupFileInTree(tree: GitTreeObject, path: string): GitObject | undefined {
  const dirs = path.split("/")

  if (dirs.length < 2) {
    // We have reached the end of the tree, look for the blob
    const [file] = dirs
    const result = tree.children.find((x) => x.name === file && x.type === "blob")
    if (!result) return
    return result
  }
  const subtree = tree.children.find((x) => x.name === dirs[0])
  if (!subtree || subtree.type === "blob") return
  return lookupFileInTree(subtree, dirs.slice(1).join("/"))
}

export function getDirName(dir: string) {
  return resolvePath(dir).split(sep).slice().reverse()[0]
}

export const formatMs = (ms: number) => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  } else {
    return `${(ms / 1000).toFixed(2)}s`
  }
}

export function generateTruckFrames(length: number) {
  const frames = []
  for (let i = 0; i < length; i++) {
    const prefix = " ".repeat(length - i - 1)
    const frame = `${prefix}🚛\n`
    frames.push(frame)
  }
  return frames
}

export function createTruckSpinner() {
  return getLogLevel() === null
    ? createSpinner("", {
        interval: 1000 / 20,
        frames: generateTruckFrames(20)
      })
    : null
}

type Spinner = ReturnType<typeof createSpinner>
let spinner: null | Spinner = null

/**
 * This function is a wrapper around a job that provides a spinner and logs the result of the job.
 * @returns
 */
export async function describeAsyncJob<T>({
  /**
   * The job to run
   */
  job = async () => null as T,
  beforeMsg = "",
  afterMsg = "",
  errorMsg = "",
  ms = null
}: {
  job: () => Promise<T>
  beforeMsg: string
  afterMsg: string
  errorMsg: string
  ms?: number | null
}): Promise<[T, null] | [null, Error]> {
  spinner = createTruckSpinner()
  const success = (text: string, final = false) => {
    if (getLogLevel() === LOG_LEVEL.SILENT) return
    if (spinner === null) return log.info(text)
    spinner.success({ text })
    if (!final) spinner.start()
  }
  const output = (text: string) => {
    if (spinner) {
      spinner.update({
        text,
        frames: generateTruckFrames(text.length)
      })
      spinner.start()
    } else log.info(text)
  }

  const error = (text: string) => (spinner === null ? log.error(text) : spinner.error({ text }))

  if (beforeMsg.length > 0) {
    output(beforeMsg)
  }
  try {
    const startTime = performance.now()
    const result = await job()
    const stopTime = performance.now()
    const suffix = c.gray(`${formatMs(!ms ? stopTime - startTime : ms)}`)
    success(`${afterMsg} ${suffix}`, true)
    return [result, null]
  } catch (e) {
    error(errorMsg)
    log.error(e as Error)
    return [null, e as Error]
  }
}

export const getBaseDirFromPath = (path: string) => resolvePath(path, "..")
export const getRepoNameFromPath = (path: string) => resolvePath(path).split(sep).reverse()[0]
export const getSiblingRepository = (path: string, repo: string) => resolvePath(getBaseDirFromPath(path), repo)

/**
 * This functions handles try / catch for you, so your code stays flat.
 * @param promise An async function
 * @returns A tuple of the result and an error. If there is no error, the error will be null.
 */
export async function promiseHelper<T>(promise: Promise<T>): Promise<[null, Error] | [T, null]> {
  try {
    return [await promise, null]
  } catch (e) {
    return [null, e as Error]
  }
}

export function isValidURI(uri: string) {
  try {
    decodeURIComponent(uri)
    return true
  } catch (error) {
    return false
  }
}

function getCommandLine() {
  switch (process.platform) {
    case "darwin":
      return "open" // MacOS
    case "win32":
      return 'start ""' // Windows
    default:
      return "xdg-open" // Linux
  }
}

export function openFile(repoDir: string, path: string) {
  path = resolvePath(repoDir, "..", path.split("/").join("/"))
  const command = `${getCommandLine()} "${path}"`
  exec(command).stderr?.on("data", (e) => {
    // TODO show error in UI
    log.error(`Cannot open file ${resolvePath(repoDir, path)}: ${e}`)
  })
}

let latestVersion: string | null = null

export async function getLatestVersion() {
  if (!latestVersion) {
    const [result] = await promiseHelper(
      fetch("https://registry.npmjs.org/-/package/git-truck/dist-tags")
        .then((res) => res.json())
        .then((pkg) => pkg.latest)
    )
    latestVersion = result
  }

  return latestVersion
}

export const readGitRepos: (baseDir: string) => Promise<Repository[]> = async (baseDir) => {
  const entries = await readdir(baseDir, { withFileTypes: true })

  // Get all directories that has a .git subdirectory
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(baseDir, entry.name)) &&
        !entry.name.startsWith(".") &&
        // TODO: Implement browsing, requires new routing
        existsSync(join(baseDir, entry.name, ".git"))
    )
    .map(({ name }) => ({ name, path: join(baseDir, name), parentDirPath: baseDir, status: "Loading" }))
}

export const isPathGitRepo = (path: string) => existsSync(join(path, ".git"))
