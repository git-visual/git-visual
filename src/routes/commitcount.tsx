import invariant from "tiny-invariant"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/commitcount"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  const path = url.searchParams.get("path")

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")
  invariant(path, "path is required")

  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return []
  return await instance.db.getCommitCountForPath(path)
}
