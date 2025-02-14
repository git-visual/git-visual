import type { HierarchyCircularNode, HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy"
import { hierarchy, pack, treemap, treemapResquarify } from "d3-hierarchy"
import type { MouseEventHandler } from "react"
import type { JSX } from "react"
import { useDeferredValue, memo, useEffect, useMemo } from "react"
import type { GitBlobObject, GitObject, GitTreeObject } from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useComponentSize } from "~/hooks"
import {
  bubblePadding,
  estimatedLetterHeightForDirText,
  estimatedLetterWidth,
  circleTreeTextOffsetY,
  treemapBlobTextOffsetX,
  treemapBlobTextOffsetY,
  treemapNodeBorderRadius,
  treemapPaddingTop,
  treemapTreeTextOffsetX,
  circleBlobTextOffsetY,
  treemapTreeTextOffsetY,
  missingInMapColor
} from "../const"
import { useData } from "../contexts/DataContext"
import { useMetrics } from "../contexts/MetricContext"
import type { ChartType } from "../contexts/OptionsContext"
import { useOptions } from "../contexts/OptionsContext"
import { usePath } from "../contexts/PathContext"
import { getTextColorFromBackground, isBlob, isTree } from "~/util"
import clsx from "clsx"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { useSearch } from "~/contexts/SearchContext"
import type { DatabaseInfo } from "~/routes/$repo.$"
import ignore, { type Ignore } from "ignore"
import { cn, usePrefersLightMode } from "~/styling"
import { isChrome, isChromium, isEdgeChromium } from "react-device-detect"

type CircleOrRectHiearchyNode = HierarchyCircularNode<GitObject> | HierarchyRectangularNode<GitObject>

export const Chart = memo(function Chart({ setHoveredObject }: { setHoveredObject: (obj: GitObject | null) => void }) {
  const [ref, rawSize] = useComponentSize()
  const { searchResults } = useSearch()
  const size = useDeferredValue(rawSize)
  const { databaseInfo } = useData()
  const { chartType, sizeMetric, depthType, hierarchyType, labelsVisible, renderCutoff } = useOptions()
  const { path } = usePath()
  const { clickedObject, setClickedObject } = useClickedObject()
  const { setPath } = usePath()
  const { showFilesWithoutChanges } = useOptions()

  let numberOfDepthLevels: number | undefined = undefined
  switch (depthType) {
    case "One":
      numberOfDepthLevels = 1
      break
    case "Two":
      numberOfDepthLevels = 2
      break
    case "Three":
      numberOfDepthLevels = 3
      break
    case "Four":
      numberOfDepthLevels = 4
      break
    case "Five":
      numberOfDepthLevels = 5
      break
    case "Full":
    default:
      numberOfDepthLevels = undefined
  }

  const filetree = useMemo(() => {
    // TODO: make filtering faster, e.g. by not having to refetch everything every time
    const ig = ignore()
    ig.add(databaseInfo.hiddenFiles)
    const filtered = filterGitTree(databaseInfo.fileTree, databaseInfo.commitCounts, showFilesWithoutChanges, ig)
    if (hierarchyType === "NESTED") return filtered
    return {
      ...filtered,
      children: flatten(filtered)
    } as GitTreeObject
  }, [
    databaseInfo.fileTree,
    hierarchyType,
    databaseInfo.hiddenFiles,
    databaseInfo.commitCounts,
    showFilesWithoutChanges
  ])

  const nodes = useMemo(() => {
    console.time("nodes")
    if (size.width === 0 || size.height === 0) return []
    const res = createPartitionedHiearchy(
      databaseInfo,
      filetree,
      size,
      chartType,
      sizeMetric,
      path,
      renderCutoff
    ).descendants()
    console.timeEnd("nodes")
    return res
  }, [size, chartType, sizeMetric, path, renderCutoff, databaseInfo, filetree])

  useEffect(() => {
    setHoveredObject(null)
  }, [chartType, size, setHoveredObject])

  const createGroupHandlers: (
    d: CircleOrRectHiearchyNode,
    isRoot: boolean
  ) => Record<"onClick" | "onMouseOver" | "onMouseOut", MouseEventHandler<SVGGElement>> = (d, isRoot) => {
    return isBlob(d.data)
      ? {
          onClick: (evt) => {
            evt.stopPropagation()
            return setClickedObject(d.data)
          },
          onMouseOver: () => setHoveredObject(d.data as GitObject),
          onMouseOut: () => setHoveredObject(null)
        }
      : {
          onClick: (evt) => {
            evt.stopPropagation()
            setClickedObject(d.data)
            setPath(d.data.path)
          },
          onMouseOver: (evt) => {
            evt.stopPropagation()
            if (!isRoot) setHoveredObject(d.data as GitObject)
            else setHoveredObject(null)
          },
          onMouseOut: () => setHoveredObject(null)
        }
  }

  const now = isChrome || isChromium || isEdgeChromium ? Date.now() : 0 // Necessary in chrome to update text positions
  return (
    <div className="relative grid place-items-center overflow-hidden" ref={ref}>
      <svg
        key={`svg|${size.width}|${size.height}`}
        className={clsx("grid h-full w-full place-items-center stroke-gray-300 dark:stroke-gray-700", {
          "cursor-zoom-out": path.includes("/")
        })}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        onClick={() => {
          // Move up to parent
          const parentPath = path.split("/").slice(0, -1).join("/")
          // Check if parent is root
          if (parentPath === "") setPath("/")
          else setPath(parentPath)
        }}
      >
        {nodes.map((d, i) => {
          return (
            <g
              key={d.data.path}
              className={clsx("transition-opacity hover:opacity-60", {
                "cursor-pointer": i === 0,
                "cursor-zoom-in": i > 0 && isTree(d.data),
                "animate-blink": clickedObject?.path === d.data.path
              })}
              {...createGroupHandlers(d, i === 0)}
            >
              {(numberOfDepthLevels === undefined || d.depth <= numberOfDepthLevels) && (
                <>
                  <Node key={d.data.path} d={d} isSearchMatch={Boolean(searchResults[d.data.path])} />
                  {labelsVisible && (
                    <NodeText key={`text|${path}|${d.data.path}|${chartType}|${sizeMetric}|${now}`} d={d}>
                      {collapseText({ d, isRoot: i === 0, path, displayText: d.data.name, chartType })}
                    </NodeText>
                  )}
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
})

function filterGitTree(
  tree: GitTreeObject,
  commitCounts: Record<string, number>,
  showFilesWithoutChanges: boolean,
  ig: Ignore
): GitTreeObject {
  function filterNode(node: GitObject): GitObject | null {
    if (ig.ignores(node.path)) {
      return null
    }
    if (node.type === "blob") {
      if (!showFilesWithoutChanges && !commitCounts[node.path]) return null
      return node
    } else {
      // It's a tree
      const children: GitObject[] = []
      for (const child of node.children) {
        const filteredChild = filterNode(child)
        if (filteredChild !== null) {
          children.push(filteredChild)
        }
      }
      if (children.length === 0) return null
      return { type: "tree", name: node.name, path: node.path, children } as GitTreeObject
    }
  }

  let filteredTree = filterNode(tree)
  if (filteredTree === null) filteredTree = { ...tree, children: [] }
  if (filteredTree.type !== "tree") {
    throw new Error("Filtered tree must be a tree structure")
  }

  return filteredTree
}

function Node({ d, isSearchMatch }: { d: CircleOrRectHiearchyNode; isSearchMatch: boolean }) {
  const [metricsData] = useMetrics()
  const { chartType, metricType, transitionsEnabled } = useOptions()

  const commonProps = useMemo(() => {
    let props: JSX.IntrinsicElements["rect"] = {
      strokeWidth: "1px",
      fill: isBlob(d.data)
        ? (metricsData.get(metricType)?.colormap.get(d.data.path) ?? missingInMapColor)
        : "transparent"
    }

    if (chartType === "BUBBLE_CHART") {
      const circleDatum = d as HierarchyCircularNode<GitObject>
      props = {
        ...props,
        x: circleDatum.x - circleDatum.r,
        y: circleDatum.y - circleDatum.r + estimatedLetterHeightForDirText - 1,
        width: circleDatum.r * 2,
        height: circleDatum.r * 2,
        rx: circleDatum.r,
        ry: circleDatum.r
      }
    } else {
      const datum = d as HierarchyRectangularNode<GitObject>

      props = {
        ...props,
        x: datum.x0,
        y: datum.y0,
        width: datum.x1 - datum.x0,
        height: datum.y1 - datum.y0,
        rx: treemapNodeBorderRadius,
        ry: treemapNodeBorderRadius
      }
    }
    return props
  }, [d, metricsData, metricType, chartType])

  return (
    <rect
      {...commonProps}
      className={cn(isSearchMatch ? "stroke-red-500" : isBlob(d.data) ? "stroke-transparent" : "", {
        "cursor-pointer": isBlob(d.data),
        "transition-all duration-500 ease-in-out": transitionsEnabled,
        "animate-stroke-pulse": isSearchMatch
      })}
    />
  )
}

function collapseText({
  d,
  isRoot,
  path,
  displayText,
  chartType
}: {
  d: CircleOrRectHiearchyNode
  isRoot: boolean
  path: string
  displayText: string
  chartType: ChartType
}): string | null {
  let textIsTooLong: (text: string) => boolean
  let textIsTooTall: (text: string) => boolean
  if (chartType === "BUBBLE_CHART") {
    const circleDatum = d as HierarchyCircularNode<GitObject>
    textIsTooLong = (text: string) => circleDatum.r < 50 || circleDatum.r * Math.PI < text.length * estimatedLetterWidth
    textIsTooTall = () => false
  } else {
    const datum = d as HierarchyRectangularNode<GitObject>
    textIsTooLong = (text: string) => datum.x1 - datum.x0 < text.length * estimatedLetterWidth
    textIsTooTall = () => {
      const heightAvailable = datum.y1 - datum.y0 - (isBlob(d.data) ? treemapBlobTextOffsetY : treemapTreeTextOffsetY)
      return heightAvailable < estimatedLetterHeightForDirText
    }
  }

  if (isRoot) {
    const pathSteps = path.split("/")
    const dispSteps = displayText.split("/")
    let ps = 0
    let ds = 0
    while (ps < pathSteps.length && ds < dispSteps.length) {
      if (pathSteps[ps] !== dispSteps[ds]) ps++
      else {
        ps++
        ds++
      }
    }

    displayText = dispSteps.slice(ds - 1).join("/")
  }

  if (textIsTooLong(displayText)) {
    displayText = displayText.replace(/\/.+\//gm, "/.../")
    if (textIsTooLong(displayText)) {
      return null
    }
  }

  if (textIsTooTall && textIsTooTall(displayText)) {
    displayText = displayText.replace(/\/.+\//gm, "/.../")

    if (textIsTooTall(displayText)) {
      return null
    }
  }

  return displayText
}

function NodeText({ d, children = null }: { d: CircleOrRectHiearchyNode; children?: React.ReactNode }) {
  const [metricsData] = useMetrics()
  const { metricType } = useOptions()
  const prefersLightMode = usePrefersLightMode()
  const isBubbleChart = isCircularNode(d)

  if (children === null) return null

  let textPathData: string

  if (isBubbleChart) {
    const yOffset = isTree(d.data) ? circleTreeTextOffsetY : circleBlobTextOffsetY
    const circleDatum = d as HierarchyCircularNode<GitObject>
    textPathData = circlePathFromCircle(circleDatum.x, circleDatum.y + yOffset, circleDatum.r)
  } else {
    const datum = d as HierarchyRectangularNode<GitObject>
    textPathData = roundedRectPathFromRect(
      datum.x0 + (isTree(d.data) ? treemapTreeTextOffsetX : treemapBlobTextOffsetX),
      datum.y0 + (isTree(d.data) ? treemapTreeTextOffsetY : treemapBlobTextOffsetY),
      datum.x1 - datum.x0,
      datum.y1 - datum.y0,
      0
    )
  }

  const fillColor = isBlob(d.data)
    ? getTextColorFromBackground(metricsData.get(metricType)?.colormap.get(d.data.path) ?? "#333")
    : prefersLightMode
      ? "#333"
      : "#fff"

  const textPathBaseProps = {
    startOffset: isBubbleChart ? "50%" : undefined,
    dominantBaseline: isBubbleChart ? (isTree(d.data) ? "central" : "hanging") : "hanging",
    textAnchor: isBubbleChart ? "middle" : "start",
    href: `#path-${d.data.path}`
  }

  return (
    <>
      <path d={textPathData} id={`path-${d.data.path}`} className="hidden" />
      {isTree(d.data) && isBubbleChart ? (
        <text
          className="pointer-events-none fill-none stroke-gray-100 stroke-[7px] font-mono text-sm font-bold dark:stroke-gray-800"
          strokeLinecap="round"
        >
          <textPath {...textPathBaseProps}>{children}</textPath>
        </text>
      ) : null}
      <text fill={fillColor} className="pointer-events-none stroke-none">
        <textPath
          {...textPathBaseProps}
          className={clsx("stroke-none font-mono", {
            "text-sm font-bold": isTree(d.data),
            "text-xs": !isTree(d.data)
          })}
        >
          {children}
        </textPath>
      </text>
    </>
  )
}

function isCircularNode(d: CircleOrRectHiearchyNode) {
  return typeof (d as HierarchyCircularNode<GitObject>).r === "number"
}

function createPartitionedHiearchy(
  databaseInfo: DatabaseInfo,
  tree: GitTreeObject,
  size: { height: number; width: number },
  chartType: ChartType,
  sizeMetricType: SizeMetricType,
  path: string,
  renderCutoff: number
) {
  let currentTree = tree
  const steps = path.substring(tree.name.length + 1).split("/")
  for (let i = 0; i < steps.length; i++) {
    for (const child of currentTree.children) {
      if (child.type === "tree") {
        const childSteps = child.name.split("/")
        if (childSteps[0] === steps[i]) {
          currentTree = child
          i += childSteps.length - 1
          break
        }
      }
    }
  }

  const castedTree = currentTree as GitObject

  const hiearchy = hierarchy(castedTree)
    .sum((d) => {
      const blob = d as GitBlobObject
      switch (sizeMetricType) {
        case "FILE_SIZE":
          return blob.sizeInBytes ?? 1
        case "MOST_COMMITS":
          return databaseInfo.commitCounts[blob.path] ?? 1
        case "EQUAL_SIZE":
          return 1
        case "LAST_CHANGED":
          return (
            (databaseInfo.lastChanged[blob.path] ?? databaseInfo.oldestChangeDate + 1) - databaseInfo.oldestChangeDate
          )
        case "MOST_CONTRIBS":
          return databaseInfo.contribSumPerFile[blob.path] ?? 1
      }
    })
    .sort((a, b) => (b.value ?? 1) - (a.value ?? 1))

  const cutOff = Number.isNaN(renderCutoff) ? 2 : renderCutoff

  if (chartType === "TREE_MAP") {
    const treeMapPartition = treemap<GitObject>()
      .tile(treemapResquarify)
      .size([size.width, size.height])
      .paddingInner(2)
      .paddingOuter(4)
      .paddingTop(treemapPaddingTop)

    const tmPartition = treeMapPartition(hiearchy)

    filterTree(tmPartition, (child) => {
      const cast = child as HierarchyRectangularNode<GitObject>
      return cast.x1 - cast.x0 >= cutOff && cast.y1 - cast.y0 >= cutOff
    })

    return tmPartition
  }
  if (chartType === "BUBBLE_CHART") {
    const bubbleChartPartition = pack<GitObject>()
      .size([size.width, size.height - estimatedLetterHeightForDirText])
      .padding(bubblePadding)
    const bPartition = bubbleChartPartition(hiearchy)
    filterTree(bPartition, (child) => {
      const cast = child as HierarchyCircularNode<GitObject>
      return cast.r >= cutOff
    })
    return bPartition
  } else {
    throw new Error("Unknown chart type: " + chartType)
  }
}

function filterTree(node: HierarchyNode<GitObject>, filter: (child: HierarchyNode<GitObject>) => boolean) {
  node.children = node.children?.filter((c) => filter(c))
  for (const child of node.children ?? []) {
    if ((child.children?.length ?? 0) > 0) filterTree(child, filter)
  }
}

// a rx ry angle large-arc-flag sweep-flag dx dy
// rx and ry are the two radii of the ellipse
// angle represents a rotation (in degrees) of the ellipse relative to the x-axis;
// large-arc-flag and sweep-flag allows to chose which arc must be drawn as 4 possible arcs can be drawn out of the other parameters.
/**
 * This function generates a path for a circle with a given radius and center
 * @param x x-coordinate of circle center
 * @param y y-coordinate of circle center
 * @param r radius of circle
 * @returns A string meant to be passed as the d attribute to a path element
 */
function circlePathFromCircle(x: number, y: number, r: number) {
  return `M${x},${y}
          m0,${r}
          a${r},${r} 0 1,1 0,${-r * 2}
          a${r},${r} 0 1,1 0,${r * 2}`
}

function roundedRectPathFromRect(x: number, y: number, width: number, height: number, radius: number) {
  radius = Math.min(radius, Math.floor(width / 3), Math.floor(height / 3))
  return `M${x + radius},${y}
          h${width - radius * 2}
          a${radius},${radius} 0 0 1 ${radius},${radius}
          v${height - radius * 2}
          a${radius},${radius} 0 0 1 ${-radius},${radius}
          h${-width + radius * 2}
          a${radius},${radius} 0 0 1 ${-radius},${-radius}
          v${-height + radius * 2}
          a${radius},${radius} 0 0 1 ${radius},${-radius}
          z`
}

function flatten(tree: GitTreeObject) {
  const flattened: GitBlobObject[] = []
  for (const child of tree.children) {
    if (child.type === "blob") {
      flattened.push(child)
    } else {
      flattened.push(...flatten(child))
    }
  }
  return flattened
}
