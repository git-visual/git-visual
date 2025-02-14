import { sleep } from "~/analyzer/util.server"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { ProgressData } from "~/components/LoadingIndicator"
import type { Route } from "./+types/progress"

const defaultResponse: ProgressData = { progress: 0, analyzationStatus: "Starting" }

export const loader = async ({ request }: Route.LoaderArgs): Promise<ProgressData> => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  if (!repo || !branch) return defaultResponse
  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return defaultResponse
  let progressPercentage = instance.progress.reduce((acc, curr) => acc + curr, 0)
  let status = instance.analyzationStatus
  while (
    instance.prevProgress.str === status + progressPercentage ||
    instance.prevProgress.timestamp + 1000 > Date.now()
  ) {
    await sleep(1000)
    progressPercentage =
      instance.totalCommitCount > 0
        ? Math.min(
            Math.floor((instance.progress.reduce((acc, curr) => acc + curr, 0) / instance.totalCommitCount) * 100),
            100
          )
        : 0
    status = instance.analyzationStatus
  }
  instance.prevProgress.str = status + progressPercentage
  instance.prevProgress.timestamp = Date.now()
  return {
    progress: progressPercentage,
    analyzationStatus: instance.analyzationStatus
  } as ProgressData
}
