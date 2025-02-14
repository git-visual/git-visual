import type { SelectHTMLAttributes } from "react"
import type { CompletedResult, GitRefs } from "~/analyzer/model"
import { mdiSourceBranch } from "@mdi/js"
import Icon from "@mdi/react"

type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: GitRefs
  analyzedBranches: CompletedResult[]
  iconGroupColorMap?: Record<string, string>
}

export function RevisionSelect({
  headGroups,
  disabled,
  className = "",
  analyzedBranches,
  ...props
}: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const groupsEntries = Object.entries(headGroups)

  return (
    <div className="grid w-full grid-cols-[auto_1fr] place-items-center gap-2">
      <Icon path={mdiSourceBranch} size={0.75} />
      <select className={`input bg-inherit text-inherit ${className}`} {...props}>
        {groupsEntries.map(([group, heads]) =>
          Object.entries(heads).length > 0 ? (
            <optgroup key={group} label={group}>
              {Object.entries(heads).map(([headName]) => {
                const isAnalyzed = analyzedBranches.find((rep) => rep.branch === headName)
                return (
                  <option
                    key={headName}
                    value={headName}
                    disabled={disabled}
                    title={isAnalyzed ? "Analyzed" : "Not analyzed"}
                  >
                    {headName}
                  </option>
                )
              })}
            </optgroup>
          ) : null
        )}
      </select>
    </div>
  )
}
