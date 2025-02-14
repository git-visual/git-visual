import Icon from "@mdi/react"
import { memo } from "react"
import type { ChartType } from "../contexts/OptionsContext"
import { Chart, useOptions } from "../contexts/OptionsContext"
import type { MetricType } from "../metrics/metrics"
import { Metric } from "../metrics/metrics"
import { EnumSelect } from "./EnumSelect"

import {
  mdiChartBubble,
  mdiChartTree,
  mdiFileCodeOutline,
  mdiImageSizeSelectSmall,
  mdiPalette,
  mdiPlusMinusVariant,
  mdiPodiumGold,
  mdiPuzzle,
  mdiResize,
  mdiScaleBalance,
  mdiSourceCommit,
  mdiUpdate
} from "@mdi/js"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"

export const relatedSizeMetric: Record<MetricType, SizeMetricType> = {
  FILE_TYPE: "FILE_SIZE",
  TOP_CONTRIBUTOR: "MOST_CONTRIBS",
  MOST_COMMITS: "MOST_COMMITS",
  LAST_CHANGED: "LAST_CHANGED",
  MOST_CONTRIBUTIONS: "MOST_CONTRIBS"
}

export const Options = memo(function Options() {
  const { metricType, chartType, sizeMetric, linkMetricAndSizeMetric, setMetricType, setChartType, setSizeMetricType } =
    useOptions()

  const visualizationIcons: Record<MetricType, string> = {
    FILE_TYPE: mdiFileCodeOutline,
    LAST_CHANGED: mdiUpdate,
    MOST_COMMITS: mdiSourceCommit,
    TOP_CONTRIBUTOR: mdiPodiumGold,
    MOST_CONTRIBUTIONS: mdiPlusMinusVariant
  }

  const sizeMetricIcons: Record<SizeMetricType, string> = {
    FILE_SIZE: mdiResize,
    EQUAL_SIZE: mdiScaleBalance,
    MOST_COMMITS: mdiSourceCommit,
    LAST_CHANGED: mdiUpdate,
    MOST_CONTRIBS: mdiPlusMinusVariant
  }

  const chartTypeIcons: Record<ChartType, string> = {
    BUBBLE_CHART: mdiChartBubble,
    TREE_MAP: mdiChartTree
  }

  return (
    <>
      <div className="card">
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiPuzzle} size="1.25em" />
            Layout
          </legend>
          <EnumSelect
            enum={Chart}
            defaultValue={chartType}
            onChange={(chartType: ChartType) => setChartType(chartType)}
            iconMap={chartTypeIcons}
          />
        </fieldset>
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiImageSizeSelectSmall} size="1.25em" />
            Size
          </legend>
          <EnumSelect
            enum={SizeMetric}
            defaultValue={sizeMetric}
            onChange={(sizeMetric: SizeMetricType) => setSizeMetricType(sizeMetric)}
            iconMap={sizeMetricIcons}
          />
        </fieldset>
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiPalette} size="1.25em" />
            Color
          </legend>
          <EnumSelect
            enum={Metric}
            defaultValue={metricType}
            onChange={(metric: MetricType) => {
              setMetricType(metric)
              if (!linkMetricAndSizeMetric) {
                return
              }
              const relatedSizeMetricType = relatedSizeMetric[metric]
              if (relatedSizeMetricType) {
                setSizeMetricType(relatedSizeMetricType)
              }
            }}
            iconMap={visualizationIcons}
          />
        </fieldset>
      </div>
    </>
  )
})
