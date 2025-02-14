import { CheckboxWithLabel } from "./util"
import { useOptions } from "../contexts/OptionsContext"
import { useTheme } from "~/styling"
import Icon from "@mdi/react"
import {
  mdiClockEdit,
  mdiCog,
  mdiContentCut,
  mdiFileTree,
  mdiLabel,
  mdiLink,
  mdiThemeLightDark,
  mdiTransition
} from "@mdi/js"
import { useId, useState, useTransition } from "react"
import anitruck from "~/assets/truck.gif"
import { ChevronButton } from "./ChevronButton"
import { relatedSizeMetric } from "./Options"

export function CollapsableSettings() {
  const [expanded, setExpanded] = useState(false)
  const expandSettingsFilesButtonId = useId()
  return (
    <div className="card flex flex-col gap-2">
      <h2 className="card__title">
        <button className="flex justify-start gap-2 hover:opacity-70" onClick={() => setExpanded(!expanded)}>
          <Icon path={mdiCog} size="1.25em" />
          Settings
          <ChevronButton id={expandSettingsFilesButtonId} className="absolute right-2 top-2" open={expanded} />
        </button>
      </h2>
      {expanded ? <Settings /> : null}
    </div>
  )
}

export function Settings() {
  const {
    metricType,
    hierarchyType,
    transitionsEnabled,
    renderCutoff,
    showFilesWithoutChanges,
    linkMetricAndSizeMetric,
    setLinkMetricAndSizeMetric,
    setTransitionsEnabled,
    labelsVisible,
    setLabelsVisible,
    setHierarchyType,
    setSizeMetricType,
    setRenderCutoff,
    setShowFilesWithoutChanges
  } = useOptions()
  const [theme, setTheme] = useTheme()
  const [isTransitioning, startTransition] = useTransition()

  return (
    <>
      <CheckboxWithLabel
        className="text-sm"
        checked={Boolean(linkMetricAndSizeMetric)}
        onChange={(e) => {
          setLinkMetricAndSizeMetric(e.target.checked)
          if (e.target.checked) {
            setSizeMetricType(relatedSizeMetric[metricType])
          }
        }}
        title="Enable to sync size metric with color metric"
      >
        <Icon className="ml-1.5" path={mdiLink} size="1.25em" />
        <span>Link size and color option</span>
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="text-sm"
        checked={transitionsEnabled}
        onChange={(e) => setTransitionsEnabled(e.target.checked)}
        title="Disable to improve performance when zooming"
      >
        <Icon className="ml-1.5" path={mdiTransition} size="1.25em" />
        Transitions
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="text-sm"
        checked={labelsVisible}
        onChange={(e) => setLabelsVisible(e.target.checked)}
        title="Disable to improve performance"
      >
        <Icon className="ml-1.5" path={mdiLabel} size="1.25em" />
        Labels
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="text-sm"
        checked={showFilesWithoutChanges}
        onChange={(e) => setShowFilesWithoutChanges(e.target.checked)}
        title="Show files that have had no changes in the selected time range"
      >
        <Icon className="ml-1.5" path={mdiClockEdit} size="1.25em" />
        Show files with no activity
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="text-sm"
        checked={hierarchyType === "FLAT"}
        onChange={() => {
          if (hierarchyType === "FLAT") setHierarchyType("NESTED")
          else setHierarchyType("FLAT")
        }}
        title="Show all files on the same level, instead of as a file tree"
      >
        <Icon className="ml-1.5" path={mdiFileTree} size="1.25em" />
        Flatten file tree
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="text-sm"
        checked={theme === "DARK"}
        onChange={() => {
          if (theme === "DARK") setTheme("LIGHT")
          else setTheme("DARK")
        }}
        title="Use a dark theme instead of light"
      >
        <Icon className="ml-1.5" path={mdiThemeLightDark} size="1.25em" />
        Use dark theme
      </CheckboxWithLabel>
      <label
        className="label flex w-full items-center justify-start gap-2 text-sm"
        title="Increase this to improve render performance, decrease it to get higher level of detail"
      >
        <span className="flex grow items-center gap-2">
          <Icon className="ml-1.5" path={mdiContentCut} size="1.25em" />
          Pixel render cut-off {isTransitioning ? <img src={anitruck} alt="..." className="h-5" /> : ""}
        </span>
        <input
          type="number"
          min={0}
          defaultValue={renderCutoff}
          className="mr-1 w-12 place-self-end border-b-2"
          onChange={(x) => startTransition(() => setRenderCutoff(x.target.valueAsNumber))}
        />
      </label>
    </>
  )
}
