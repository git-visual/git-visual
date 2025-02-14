import { useFetcher, useLocation } from "react-router";
import clsx from "clsx"
import { useEffect, useMemo } from "react"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import anitruck from "~/assets/truck.gif"
import { cn } from "~/styling"

export type ProgressData = {
  progress: number
  analyzationStatus: AnalyzationStatus
}

export function LoadingIndicator({
  className = "",
  hideInitially = true,
  loadingText
}: {
  loadingText?: string
  hideInitially?: boolean
  className?: string
}) {
  const location = useLocation()
  const fetcher = useFetcher<ProgressData>()
  useEffect(() => {
    if (fetcher.state === "idle") {
      const [, repo, branch] = location.pathname.split("/") ?? ["", "", ""]
      fetcher.load(`/progress?repo=${repo}&branch=${branch}`)
    }
  }, [fetcher, fetcher.state, location.pathname])

  const progressText = useMemo(() => {
    if (!fetcher.data) return "Starting analysis"
    const { progress, analyzationStatus } = fetcher.data
    if (!analyzationStatus || analyzationStatus === "Starting") return "Starting analysis"
    if (analyzationStatus === "GeneratingChart") return "Generating chart"
    return "Analyzing commits: " + progress + "% done"
  }, [fetcher.data])

  return (
    <div className={clsx("grid h-full w-full place-items-center", className)}>
      <div className={cn("flex flex-col px-2 py-2", { "animate-hide-initially opacity-0": hideInitially })}>
        <p className="text-center text-3xl font-bold opacity-70">{loadingText ?? progressText}</p>
        <img src={anitruck} alt={"🚛"} className="w-full min-w-0 max-w-sm self-center" />
      </div>
    </div>
  )
}
