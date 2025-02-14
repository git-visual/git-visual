import sha1 from "sha1"
import uniqolor from "uniqolor"
import type { GitBlobObject, GitTreeObject } from "~/analyzer/model"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import type { PointInfo, PointLegendData } from "~/components/legend/PointLegend"
import type { SegmentLegendData } from "~/components/legend/SegmentLegend"
import { noEntryColor } from "~/const"
import type { RepoData } from "~/routes/$repo.$"
import type { LegendType } from "../components/legend/Legend"
import { setExtensionColor } from "./fileExtension"
import { getLastChangedIndex, lastChangedGroupings } from "./lastChanged"
import { CommitAmountTranslater } from "./mostCommits"
import { ContribAmountTranslater } from "./mostContribs"
import { setDominantAuthorColor } from "./topContributer"

export type MetricsData = [Map<MetricType, MetricCache>, Map<string, string>]

export const Metric = {
  FILE_TYPE: "File type",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBUTIONS: "Line changes",
  TOP_CONTRIBUTOR: "Top contributor",
  LAST_CHANGED: "Last changed"
}

export type MetricType = keyof typeof Metric

export function createMetricData(
  data: RepoData,
  colorSeed: string | null,
  predefinedAuthorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number
): MetricsData {
  const authorColors = generateAuthorColors(data.databaseInfo.authors, colorSeed, predefinedAuthorColors)

  return [
    setupMetricsCache(data.databaseInfo.fileTree, getMetricCalcs(data, authorColors, dominantAuthorCutoff)),
    new Map(Object.entries(authorColors))
  ]
}

export function getMetricDescription(metric: MetricType): string {
  switch (metric) {
    case "FILE_TYPE":
      return "Where are different types of files located?"
    case "MOST_COMMITS":
      return "Which files have had the most commits, in the selected time range?"
    case "LAST_CHANGED":
      return "How long ago did the files change?"
    case "TOP_CONTRIBUTOR":
      return "Shows the top author for each file. Adjust the minimum percentage of line changes, that the top author should have, for each file to be colored."
    case "MOST_CONTRIBUTIONS":
      return "How many line changes (additions and deletions) have been made to the file?"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export function getMetricLegendType(metric: MetricType): LegendType {
  switch (metric) {
    case "FILE_TYPE":
    case "TOP_CONTRIBUTOR":
      return "POINT"
    case "MOST_COMMITS":
    case "MOST_CONTRIBUTIONS":
      return "GRADIENT"
    case "LAST_CHANGED":
      return "SEGMENTS"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export interface MetricCache {
  legend: PointLegendData | GradLegendData | SegmentLegendData | undefined
  colormap: Map<string, `#${string}`>
}

export function generateAuthorColors(
  authors: string[],
  colorSeed: string | null,
  predefinedAuthorColors: Record<string, `#${string}`>
): Record<string, `#${string}`> {
  const result: Record<string, `#${string}`> = {}
  const seed = colorSeed ?? ""
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i]
    const existing = predefinedAuthorColors[author]
    if (existing) {
      result[author] = existing
      continue
    }
    const hashed = sha1(author + seed)
    const color = uniqolor(hashed).color as `#${string}`
    result[author] = color
  }
  return result
}

export function getMetricCalcs(
  data: RepoData,
  authorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number
): [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][] {
  const maxCommitCount = data.databaseInfo.maxCommitCount
  const minCommitCount = data.databaseInfo.minCommitCount
  const newestEpoch = data.databaseInfo.newestChangeDate
  const groupings = lastChangedGroupings(newestEpoch)
  const commitmapper = new CommitAmountTranslater(minCommitCount, maxCommitCount)
  const maxContribCount = data.databaseInfo.maxMinContribCounts.max
  const minContribCount = data.databaseInfo.maxMinContribCounts.min
  const contribmapper = new ContribAmountTranslater(minContribCount, maxContribCount)

  return [
    [
      "FILE_TYPE",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = new Map<string, PointInfo>()
        }
        setExtensionColor(blob, cache)
      }
    ],
    [
      "MOST_COMMITS",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            `${minCommitCount}`,
            `${maxCommitCount}`,
            undefined,
            undefined,
            commitmapper.getColor(minCommitCount),
            commitmapper.getColor(maxCommitCount)
          ]
        }
        commitmapper.setColor(blob, cache, data.databaseInfo.commitCounts)
      }
    ],
    [
      "LAST_CHANGED",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.oldestChangeDate) + 1,
            (n) => groupings[n].text,
            (n) => groupings[n].color,
            (blob) => getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.lastChanged[blob.path] ?? 0) ?? -1
          ]
        }
        const existing = data.databaseInfo.lastChanged[blob.path]
        const color = existing ? groupings[getLastChangedIndex(groupings, newestEpoch, existing)].color : noEntryColor
        cache.colormap.set(blob.path, color)
      }
    ],
    [
      "TOP_CONTRIBUTOR",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominantAuthorColor(
          authorColors,
          blob,
          cache,
          data.databaseInfo.dominantAuthors,
          dominantAuthorCutoff,
          data.databaseInfo.contribSumPerFile
        )
      }
    ],
    [
      "MOST_CONTRIBUTIONS",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            `${minContribCount}`,
            `${maxContribCount}`,
            undefined,
            undefined,
            contribmapper.getColor(minContribCount),
            contribmapper.getColor(maxContribCount)
          ]
        }
        contribmapper.setColor(blob, cache, data.databaseInfo.contribSumPerFile)
      }
    ]
  ]
}

export function setupMetricsCache(
  tree: GitTreeObject,
  metricCalcs: [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][]
) {
  const metricCache = new Map<MetricType, MetricCache>()
  setupMetricsCacheRec(tree, metricCalcs, metricCache)
  return metricCache
}

function setupMetricsCacheRec(
  tree: GitTreeObject,
  metricCalcs: [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][],
  acc: Map<MetricType, MetricCache>
) {
  for (const child of tree.children) {
    switch (child.type) {
      case "tree":
        setupMetricsCacheRec(child, metricCalcs, acc)
        break
      case "blob":
        for (const [metricType, metricFunc] of metricCalcs) {
          if (!acc.has(metricType))
            acc.set(metricType, {
              legend: undefined,
              colormap: new Map<string, `#${string}`>()
            })
          metricFunc(
            child,
            acc.get(metricType) ?? {
              legend: undefined,
              colormap: new Map<string, `#${string}`>()
            }
          )
        }
        break
    }
  }
}
