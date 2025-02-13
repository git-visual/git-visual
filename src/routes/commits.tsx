import invariant from "tiny-invariant"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/commits"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  const path = url.searchParams.get("path")
  const count = url.searchParams.get("count")

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")
  invariant(path, "path is required")
  invariant(count, "count is required")

  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return []

  const commitHashes = await instance.db.getCommitHashes(path, Number(count))
  if (commitHashes.length < 1) return []
  const gitLogResult = await instance.gitCaller.gitLogSpecificCommits(commitHashes)
  const fullCommits = await instance.getFullCommits(gitLogResult)
  const unions = await instance.db.getRawUnions()
  return fullCommits.map((commit) => {
    const alias = unions.find(({ alias }) => alias === commit.author)
    if (!alias) return commit
    return {
      ...commit,
      author: alias.actualname
    }
  })
}
