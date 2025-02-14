/* eslint-disable no-case-declarations */
import { mdiFolder, mdiMenuRight } from "@mdi/js"
import Icon from "@mdi/react"
import { Fragment, memo, useMemo, useRef } from "react"
import type { GitBlobObject, GitObject } from "~/analyzer/model"
import { useData } from "~/contexts/DataContext"
import type { DatabaseInfo } from "~/routes/$repo.$"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import type { MetricType } from "../metrics/metrics"
import { allExceptFirst, dateFormatRelative, isBlob } from "../util"
import { LegendDot } from "./util"

interface TooltipProps {
  hoveredObject: GitObject | null
  x: number
  y: number
  w: number
}

export const Tooltip = memo(function Tooltip({ hoveredObject, x, y }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const { databaseInfo } = useData()
  const color = useMemo(() => {
    if (!hoveredObject) {
      return null
    }
    const colormap = metricsData.get(metricType)?.colormap
    const color = colormap?.get(hoveredObject.path) ?? "grey"
    return color
  }, [hoveredObject, metricsData, metricType])

  const right = useMemo(() => x < window.innerWidth / 2, [x])
  const top = useMemo(() => y < window.innerHeight / 2, [y])
  const xTransform = useMemo(() => (right ? `calc(1rem + ${x}px)` : `calc(-1rem + ${x}px - 100%)`), [right, x])
  const yTransform = useMemo(() => (top ? `calc(1rem + ${y}px)` : `calc(-1rem + ${y}px - 100%)`), [top, y])
  const visible = hoveredObject !== null

  return (
    <div
      className={`card absolute left-0 top-0 z-50 flex w-max flex-row place-items-center rounded-full bg-gray-100/50 py-0 pl-1 pr-2 backdrop-blur will-change-transform dark:bg-gray-800/40 ${
        visible ? "visible" : "hidden"
      }`}
      ref={tooltipRef}
      style={{
        transform: visible ? `translate(${xTransform}, ${yTransform})` : "none"
      }}
    >
      {hoveredObject?.type === "blob" ? (
        color ? (
          <LegendDot dotColor={color} />
        ) : null
      ) : (
        <Icon className="ml-0.5" path={mdiFolder} size={0.75} />
      )}
      <span className="card__subtitle items-center font-bold">
        {hoveredObject && isBlob(hoveredObject)
          ? hoveredObject?.name
          : allExceptFirst(hoveredObject?.path.split("/") ?? []).map((segment, index, segments) => (
              <Fragment key={`segment-${index}${segment}`}>
                {segment}
                {segments.length > 1 && index < segments.length - 1 ? <Icon path={mdiMenuRight} size={1} /> : null}
              </Fragment>
            ))}
      </span>
      {hoveredObject?.type === "blob"
        ? ColorMetricDependentInfo({
            metric: metricType,
            hoveredBlob: hoveredObject,
            databaseInfo
          })
        : null}
    </div>
  )
})

function ColorMetricDependentInfo(props: {
  metric: MetricType
  hoveredBlob: GitBlobObject | null
  databaseInfo: DatabaseInfo
}) {
  const slicedPath = props.hoveredBlob?.path ?? ""
  switch (props.metric) {
    case "MOST_COMMITS":
      const noCommits = props.databaseInfo.commitCounts[slicedPath]
      if (!noCommits) return "No activity"
      return `${noCommits} commit${noCommits > 1 ? "s" : ""}`
    case "LAST_CHANGED":
      const epoch = props.databaseInfo.lastChanged[slicedPath]
      if (!epoch) return "No activity"
      return <>{dateFormatRelative(epoch)}</>
    case "TOP_CONTRIBUTOR":
      const dominant = props.databaseInfo.dominantAuthors[slicedPath]
      const contribSum = props.databaseInfo.contribSumPerFile[slicedPath]
      if (!dominant) return "No activity"
      if (!contribSum) return <>{dominant.author}</>
      const authorPercentage = Math.round((dominant.contribcount / contribSum) * 100)
      return (
        <>
          {dominant.author} {authorPercentage}%
        </>
      )
    case "MOST_CONTRIBUTIONS":
      const contribs = props.databaseInfo.contribSumPerFile[slicedPath]
      if (!contribs) return <>No activity</>
      return <>{contribs} line changes</>
    default:
      return null
  }
}
