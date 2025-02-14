import { useTransition, useState, useRef, useEffect } from "react"
import { useNavigation, useSubmit } from "react-router";
import { useData } from "~/contexts/DataContext"
import { getPathFromRepoAndHead } from "~/util"
import { CloseButton, LegendDot, CheckboxWithLabel } from "~/components/util"
import { useMetrics } from "~/contexts/MetricContext"
import Icon from "@mdi/react"
import { mdiArrowUp, mdiAccountMultiple } from "@mdi/js"
import { createPortal } from "react-dom"
import { useKey } from "~/hooks"

export function UnionAuthorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { repo, databaseInfo } = useData()
  const submit = useSubmit()
  const { authors } = databaseInfo
  const authorUnions = databaseInfo.authorUnions
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([])
  const [filter, setFilter] = useState("")
  const navigationData = useNavigation()
  const [, authorColors] = useMetrics()
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!ref.current) {
      return
    }

    if (open) {
      ref.current.showModal()
      return
    }
    ref.current.close()
  }, [open])

  const flattedUnionedAuthors = authorUnions
    .reduce((acc, union) => {
      return [...acc, ...union]
    }, [] as string[])
    .sort(stringSorter)

  function ungroup(groupToUnGroup: number) {
    const newAuthorUnions = authorUnions.filter((_, i) => i !== groupToUnGroup)
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post"
    })
  }

  function ungroupAll() {
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify([]))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post"
    })
  }

  function groupSelectedAuthors() {
    if (selectedAuthors.length === 0) return
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify([...authorUnions, selectedAuthors]))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post"
    })
    setSelectedAuthors([])
  }

  function makePrimaryAlias(alias: string, groupIndex: number) {
    const newAuthorUnions = authorUnions.map((group, i) => {
      if (i === groupIndex) {
        return [alias, ...group.filter((a) => a !== alias)]
      }
      return group
    })
    const form = new FormData()
    form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post"
    })
  }

  const disabled = navigationData.state !== "idle"

  const ungroupedAuthorsSorted = authors
    .filter((a) => !flattedUnionedAuthors.includes(a))
    .slice(0)
    .sort(stringSorter)

  useKey("Escape", onClose)

  const getColorFromDisplayName = (displayName: string) => authorColors.get(displayName) ?? "#333"

  if (!open) return null

  const ungroupedAuthorsMessage =
    ungroupedAuthorsSorted.length === 0
      ? "All detected authors have been grouped"
      : "Select the authors that you know are the same person"

  const ungroupedAuthorsFiltered = ungroupedAuthorsSorted.filter((author) =>
    author.toLowerCase().includes(filter.toLowerCase())
  )
  const ungroupedAuthorsEntries = ungroupedAuthorsFiltered.map((author) => (
    <CheckboxWithLabel
      className="hover:opacity-70"
      key={author}
      checked={selectedAuthors.includes(author)}
      onChange={(e) => {
        const newSelectedAuthors = e.target?.checked
          ? [...selectedAuthors, author]
          : selectedAuthors.filter((a) => a !== author)
        setSelectedAuthors(newSelectedAuthors)
      }}
    >
      <div className="inline-flex flex-row place-items-center gap-2">
        <LegendDot dotColor={getColorFromDisplayName(author)} />
        {author}
      </div>
    </CheckboxWithLabel>
  ))

  const groupedAuthorsEntries = authorUnions.map((aliasGroup, aliasGroupIndex) => {
    const displayName = aliasGroup[0]
    const disabled = navigationData.state !== "idle"
    const color = getColorFromDisplayName(displayName)

    return (
      <div className="card group m-0 flex h-full flex-col p-2" key={aliasGroupIndex}>
        <div className="inline-flex flex-row place-items-center gap-2">
          <LegendDot dotColor={color} />
          <b className="truncate" title={displayName}>
            {displayName}
          </b>
        </div>
        {aliasGroup
          .slice(1)
          .sort(stringSorter)
          .map((alias) => (
            <AliasEntry
              key={alias}
              alias={alias}
              onClick={() => makePrimaryAlias(alias, aliasGroupIndex)}
              disabled={disabled}
            />
          ))}
        <div className="grow" />
        <div className="flex items-end justify-end gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            className="btn"
            title="Add selected authors to this group"
            onClick={() => {
              const newAuthorUnions = authorUnions.map(([displayName, ...group], i) => {
                if (i === aliasGroupIndex) {
                  return [displayName, ...group, ...selectedAuthors]
                }
                return [displayName, ...group]
              })
              const form = new FormData()
              form.append("unionedAuthors", JSON.stringify(newAuthorUnions))

              submit(form, {
                action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
                method: "post"
              })
              setSelectedAuthors([])
            }}
            disabled={disabled || selectedAuthors.length === 0}
          >
            Add selected
          </button>
          <button className="btn" onClick={() => ungroup(aliasGroupIndex)} title="Ungroup" disabled={disabled}>
            Ungroup
          </button>
        </div>
      </div>
    )
  })

  return createPortal(
    <dialog
      ref={ref}
      aria-modal
      className="z-10 m-auto flex h-full w-full flex-col items-start justify-stretch bg-transparent text-inherit backdrop:bg-gray-500/75 backdrop:p-0"
    >
      <div className="card m-auto grid h-full w-full max-w-(--breakpoint-2xl) grow grid-cols-[1fr_1fr] grid-rows-[max-content_max-content_max-content_1fr_max-content] gap-2 overflow-hidden shadow-sm">
        <h2 className="text-2xl">Group authors</h2>
        <CloseButton absolute={false} className="justify-self-end" onClick={onClose} />

        <h3 className="text-center text-lg font-bold">Ungrouped authors ({ungroupedAuthorsSorted.length})</h3>
        <h3 className="text-center text-lg font-bold">Grouped authors</h3>

        <div className="flex justify-end gap-2">
          <button
            className="btn btn--primary justify-self-end"
            onClick={groupSelectedAuthors}
            title="Group the selected authors"
            disabled={disabled || selectedAuthors.length === 0}
          >
            <Icon path={mdiAccountMultiple} size={1} />
            Create group
          </button>
        </div>
        <div className="flex justify-end gap-4">
          <button
            className="btn btn--danger"
            disabled={disabled || authorUnions.length === 0}
            onClick={() => {
              if (confirm("Are you sure you want to ungroup all grouped authors?")) ungroupAll()
            }}
          >
            Ungroup all
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="flex h-min min-h-0 flex-col gap-2 rounded-md bg-white p-4 pt-2 shadow-sm dark:bg-gray-700">
            <div className="sticky top-0 flex gap-2 bg-inherit pt-2">
              <input
                className="input min-w-0"
                type="search"
                placeholder="Filter..."
                disabled={ungroupedAuthorsSorted.length === 0}
                onChange={(e) => startTransition(() => setFilter(e.target.value))}
              />
              <button
                disabled={disabled || selectedAuthors.length === 0}
                onClick={() => setSelectedAuthors([])}
                className="btn btn--outlined w-max grow"
                title="Clear selection"
              >
                Clear
              </button>
              <button
                disabled={ungroupedAuthorsSorted.length === 0}
                onClick={() =>
                  selectedAuthors.length === ungroupedAuthorsFiltered.length
                    ? setSelectedAuthors([])
                    : setSelectedAuthors((selected) => Array.from(new Set([...selected, ...ungroupedAuthorsFiltered])))
                }
                className="btn btn--outlined w-max grow"
                title="Clear selection"
              >
                {selectedAuthors.length === ungroupedAuthorsFiltered.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            {ungroupedAuthorsEntries.length > 0 ? (
              ungroupedAuthorsEntries
            ) : (
              <p className="place-self-center">
                {filter.length > 0 ? "No authors found" : "All authors have been grouped"}
              </p>
            )}
          </div>
        </div>
        <div className="overflow-y-auto">
          <div className="grid h-min min-h-0 grid-cols-1 gap-4 rounded-md bg-white p-4 shadow-sm lg:grid-cols-2 xl:grid-cols-3 dark:bg-gray-700">
            {authorUnions.length > 0 ? (
              groupedAuthorsEntries
            ) : (
              <p className="place-self-center">No authors have been grouped yet</p>
            )}
          </div>
        </div>

        <div className="col-span-2 mr-6 grid w-full grid-cols-2 gap-4">
          <p>{ungroupedAuthorsMessage}</p>
          <button className="btn btn--primary justify-self-end" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </dialog>,
    document.body
  )

  function AliasEntry({
    alias,
    onClick,
    disabled
  }: {
    alias: string
    disabled?: boolean
    onClick: () => void
  }): JSX.Element {
    return (
      <button
        key={alias}
        className="btn--icon flex grid-flow-col gap-2 text-sm [&:hover>svg]:opacity-50 [&>svg]:opacity-0"
        disabled={disabled}
        onClick={onClick}
        title="Make display name for this grouping"
      >
        <Icon path={mdiArrowUp} size={0.75} />
        <label title={alias} className="label truncate">
          {alias}
        </label>
      </button>
    )
  }
}

const stringSorter = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
