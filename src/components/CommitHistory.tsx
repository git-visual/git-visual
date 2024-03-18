/* eslint-disable react-hooks/exhaustive-deps */
import type { CommitDTO, GitLogEntry } from "~/analyzer/model"
import { useEffect, useMemo, useState } from "react"
import { dateFormatLong, dateFormatRelative, dateTimeFormatShort } from "~/util"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { useFetcher } from "@remix-run/react"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"
import { CloseButton, LegendDot } from "./util"
import { useMetrics } from "~/contexts/MetricContext"
import { Popover, ArrowContainer } from 'react-tiny-popover'

type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: CommitDTO[]
  count: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: CommitDTO) => void
}

function CommitDistFragment(props: CommitDistFragProps) {
  const sortMethod: SortCommitsMethods = props.sortBy !== undefined ? props.sortBy : "date"
  const [, authorColors] = useMetrics()
  const cleanGroupItems: { [key: string]: CommitDTO[] } = sortCommits(props.items.slice(0, props.count), sortMethod)

  const items: Array<AccordionData> = new Array<AccordionData>()
  for (const [key, values] of Object.entries(cleanGroupItems)) {
    items.push({
      title: key,
      content: (
        <>
          {values.map((value: CommitDTO) => {
            return <CommitListEntry key={value.hash + "--itemContentAccordion"} authorColor={authorColors.get(value.author) ?? "grey"} value={value}/>
          })}
        </>
      )
    })
  }

  return (
    <Accordion
      key={items.length > 0 ? items[0].title : new Date().toDateString()}
      titleLabels={true}
      multipleOpen={true}
      openByDefault={true}
      items={items}
    />
  )
}

function InfoEntry(props: {keyString: string, value: string}) {
  return (
    <>
      <div className="flex grow overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        {props.keyString}
      </div>
      <p className="break-all overflow-ellipsis text-sm">{props.value}</p>
    </>
  )
}

function CommitListEntry(props: {value: CommitDTO, authorColor: string}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  return (
    <div 
      title={`By: ${props.value.author}`}
      className="flex items-center gap-2 overflow-hidden overflow-ellipsis whitespace-pre"
    >
    <LegendDot className="ml-1" dotColor={props.authorColor} authorColorToChange={props.value.author} />
    <Popover
      isOpen={isPopoverOpen}
      positions={['left', 'top', 'bottom', 'right']} // preferred positions by priority
      content={ ({ position, childRect, popoverRect }) =>
        <ArrowContainer position={position} childRect={childRect} popoverRect={popoverRect} arrowSize={10} arrowColor="white">
          <div className="card grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 max-w-lg pr-10">
            <CloseButton absolute={true} onClick={() => setIsPopoverOpen(false)}/>
            <InfoEntry keyString="Hash" value={props.value.hash}/>
            <InfoEntry keyString="Author" value={props.value.author}/>
            { props.value.committertime === props.value.authortime 
              ? <InfoEntry keyString="Date" value={`${dateTimeFormatShort(props.value.committertime * 1000)} (${dateFormatRelative(props.value.committertime)})`}/>
              : (<>
                  <InfoEntry keyString="Date committed" value={`${dateTimeFormatShort(props.value.committertime * 1000)} (${dateFormatRelative(props.value.committertime)})`}/>
                  <InfoEntry keyString="Date authored" value={`${dateTimeFormatShort(props.value.authortime * 1000)} (${dateFormatRelative(props.value.authortime)})`}/>
                </>)}
            <InfoEntry keyString="Message" value={props.value.message}/>
            <InfoEntry keyString="Body" value={props.value.body.length > 0 ? props.value.body : "<none>"}/>
          </div>
        </ArrowContainer>
      }
      onClickOutside={() => setIsPopoverOpen(false)}
    >
      <div className="flex items-center gap-2 overflow-hidden overflow-ellipsis whitespace-pre cursor-pointer hover:opacity-70">
        <li onClick={() => setIsPopoverOpen(!isPopoverOpen)} className="font-bold opacity-80">
          {props.value.message}
        </li>
      </div>
    </Popover>
  </div>
  )
}

export function CommitHistory(props: {commitCount: number}) {
  const analyzerData = useData()
  const [commits, setCommits] = useState<CommitDTO[] | null>(null)
  const [commitShowCount, setCommitShowCount] = useState(10)
  const commitIncrement = 10
  const { clickedObject } = useClickedObject()
  const fetcher = useFetcher()

  function fetchCommits() {
    if (!clickedObject) return
    setCommitShowCount((prev) => prev + commitIncrement)
    const searchParams = new URLSearchParams()
    searchParams.set("branch", analyzerData.repodata2.branch)
    searchParams.set("repo", analyzerData.repodata2.repo)
    searchParams.set("path", clickedObject.path)
    searchParams.set("count", (commitShowCount + commitIncrement) + "")
    fetcher.load(`/commits?${searchParams.toString()}`)
  }

  useEffect(() => {
    setCommitShowCount(0)
    fetchCommits()
  }, [clickedObject])

  useEffect(() => {
    if (fetcher.state !== "idle") return
    const data = fetcher.data as GitLogEntry[] | null
    setCommits(data)
  }, [fetcher])

  const headerText = useMemo<string>(() => {
    if (!clickedObject) return ""
    return `Commit history`
  }, [clickedObject, commits])

  if (!clickedObject) return null

  if (!commits) {
    return (
      <>
        <h3 className="font-bold">Commit history</h3>
        <h3>Loading commits...</h3>
      </>
    )
  }

  if (commits.length === 0) {
    return <h3 className="font-bold">No commit history</h3>
  }

  return (
    <>
      <div className="flex justify-between">
        <h3 className="font-bold">{headerText}</h3>
      </div>
      <div>
        <CommitDistFragment items={commits} count={commitShowCount}/>

        {fetcher.state === "idle" ? (
          commitShowCount < props.commitCount ? (
            <span
            onClick={fetchCommits}
            className="whitespace-pre text-xs font-medium opacity-70 hover:cursor-pointer"
            >
              Show more commits
            </span>
          ) : null
        ) : (
          <h3>Loading commits...</h3>
        )}
      </div>
    </>
  )
}

function sortCommits(items: CommitDTO[], method: SortCommitsMethods): { [key: string]: CommitDTO[] } {
  const cleanGroupItems: { [key: string]: CommitDTO[] } = {}
  switch (method) {
    case "author":
      for (const commit of items) {
        const author: string = commit.author
        if (!cleanGroupItems[author]) {
          cleanGroupItems[author] = []
        }
        cleanGroupItems[author].push(commit)
      }
      break
    case "date":
    default:
      for (const commit of items) {
        const date: string = dateFormatLong(commit.committertime)
        if (!cleanGroupItems[date]) {
          cleanGroupItems[date] = []
        }
        cleanGroupItems[date].push(commit)
      }
  }
  return cleanGroupItems
}
