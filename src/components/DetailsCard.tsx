/* eslint-disable react-hooks/exhaustive-deps */
import { mdiAccountMultiple, mdiEyeOffOutline, mdiFile, mdiFolder, mdiOpenInNew } from "@mdi/js"
import Icon from "@mdi/react"
import { type Fetcher, Form, useFetcher, useLocation, useNavigation } from "react-router";
import byteSize from "byte-size"
import clsx from "clsx"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { GitObject, GitTreeObject } from "~/analyzer/model"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { ChevronButton } from "~/components/ChevronButton"
import { CloseButton } from "~/components/util"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { usePath } from "~/contexts/PathContext"
import { usePrefersLightMode } from "~/styling"
import { dateFormatLong, getTextColorFromBackground, last } from "~/util"
import { CommitsCard } from "./CommitsCard"
import { MenuItem, MenuTab } from "./MenuTab"

function OneFolderOut(path: string) {
  const index = path.lastIndexOf("/")
  const index2 = path.lastIndexOf("\\")
  if (index !== -1) return path.slice(0, index)
  if (index2 !== -1) return path.slice(0, index2)
  return path
}

export function DetailsCard({
  className = "",
  showUnionAuthorsModal
}: {
  className?: string
  showUnionAuthorsModal: () => void
}) {
  const { setClickedObject, clickedObject } = useClickedObject()
  const location = useLocation()
  const { metricType } = useOptions()
  const { state } = useNavigation()
  const { setPath, path } = usePath()
  const { databaseInfo } = useData()
  const isProcessingHideRef = useRef(false)
  const [commitCount, setCommitCount] = useState<number | null>(null)
  const slicedPath = useMemo(() => clickedObject?.path ?? "", [clickedObject])

  const existingCommitCount = databaseInfo.commitCounts[slicedPath]

  const commitFetcher = useFetcher()

  useEffect(() => {
    if (clickedObject?.type === "blob" && existingCommitCount) {
      setCommitCount(existingCommitCount)
    } else {
      fetchCommitCount()
    }
  }, [databaseInfo, clickedObject])

  function fetchCommitCount() {
    const searchParams = new URLSearchParams()
    searchParams.set("branch", databaseInfo.branch)
    searchParams.set("repo", databaseInfo.repo)
    if (!clickedObject?.path) return
    searchParams.set("path", clickedObject.path)
    commitFetcher.load(`/commitcount?${searchParams.toString()}`)
  }

  useEffect(() => {
    if (commitFetcher.state === "idle") {
      const data = commitFetcher.data as number
      setCommitCount(data)
    }
  }, [commitFetcher])

  const [authorContributions, setAuthorContributions] = useState<{ author: string; contribs: number }[] | null>(null)
  const contribSum = useMemo(() => {
    if (!authorContributions) return 0
    return authorContributions.reduce((acc, curr) => acc + curr.contribs, 0)
  }, [authorContributions])

  const fetcher = useFetcher()

  useEffect(() => {
    const searchParams = new URLSearchParams()
    searchParams.set("branch", databaseInfo.branch)
    searchParams.set("repo", databaseInfo.repo)
    if (!clickedObject?.path) return
    searchParams.set("path", clickedObject.path)
    searchParams.set("isblob", String(clickedObject.type === "blob"))
    fetcher.load(`/authordist?${searchParams.toString()}`)
  }, [clickedObject, databaseInfo])

  useEffect(() => {
    if (fetcher.state === "idle") {
      const data = (fetcher.data ?? []) as { author: string; contribs: number }[]
      setAuthorContributions(data)
    }
  }, [fetcher])
  const prefersLightMode = usePrefersLightMode()

  useEffect(() => {
    if (isProcessingHideRef.current) {
      setClickedObject(null)
      isProcessingHideRef.current = false
    }
  }, [clickedObject, setClickedObject, state])

  useEffect(() => {
    // Update clickedObject if data changes
    setClickedObject((clickedObject) => findObjectInTree(databaseInfo.fileTree, clickedObject))
  }, [databaseInfo, setClickedObject])

  const [metricsData] = useMetrics()
  const { backgroundColor, lightBackground } = useMemo(() => {
    if (!clickedObject) {
      return {
        backgroundColor: null,
        color: null
      }
    }
    const colormap = metricsData.get(metricType)?.colormap
    const backgroundColor =
      colormap?.get(clickedObject.path) ?? ((prefersLightMode ? "#808080" : "#262626") as `#${string}`)
    const color = backgroundColor ? getTextColorFromBackground(backgroundColor) : null
    return {
      backgroundColor: backgroundColor,
      color: color,
      lightBackground: color === "#000000"
    }
  }, [clickedObject, metricsData, metricType, prefersLightMode])

  if (!clickedObject) return null
  const isBlob = clickedObject.type === "blob"
  const extension = last(clickedObject.name.split("."))
  // TODO: handle binary file properly or remove the entry
  return (
    <div
      className={clsx(className, "card flex flex-col gap-2 transition-colors", {
        "text-gray-100": !lightBackground,
        "text-gray-800": lightBackground
      })}
      {...(backgroundColor
        ? {
            style: {
              backgroundColor
            }
          }
        : {})}
    >
      <div className="flex">
        <h2 className="card__title grid w-full grid-cols-[auto_1fr_auto] gap-2">
          <Icon path={clickedObject.type === "blob" ? mdiFile : mdiFolder} size="1.25em" />
          <span className="truncate" title={clickedObject.name}>
            {clickedObject.name}
          </span>
          <CloseButton absolute={false} onClick={() => setClickedObject(null)} />
        </h2>
      </div>
      <MenuTab>
        <MenuItem title="General">
          <div className="flex grow flex-col gap-2">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <CommitsEntry count={commitCount ?? 0} />
              {isBlob ? (
                <>
                  <SizeEntry size={clickedObject.sizeInBytes} isBinary={false} />
                  <LastchangedEntry epoch={databaseInfo.lastChanged[slicedPath]} />
                </>
              ) : (
                <FileAndSubfolderCountEntries clickedTree={clickedObject} />
              )}
              <PathEntry path={clickedObject.path} />
            </div>
            <div className="card bg-white/70 text-black">
              <AuthorDistribution authors={authorContributions} contribSum={contribSum} fetcher={fetcher} />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {isBlob ? (
              <>
                <Form className="w-max" method="post" action={location.pathname}>
                  <input type="hidden" name="ignore" value={clickedObject.path} />
                  <button
                    className="btn btn--outlined"
                    type="submit"
                    disabled={state !== "idle"}
                    onClick={() => {
                      isProcessingHideRef.current = true
                    }}
                    title="Hide this file"
                  >
                    <Icon path={mdiEyeOffOutline} />
                    Hide
                  </button>
                </Form>
                {clickedObject.name.includes(".") ? (
                  <Form className="w-max" method="post" action={location.pathname}>
                    <input type="hidden" name="ignore" value={`*.${extension}`} />
                    <button
                      className="btn btn--outlined"
                      type="submit"
                      disabled={state !== "idle"}
                      title={`Hide all files with .${extension} extension`}
                      onClick={() => {
                        isProcessingHideRef.current = true
                      }}
                    >
                      <Icon path={mdiEyeOffOutline} />
                      <span>Hide .{extension}</span>
                    </button>
                  </Form>
                ) : null}
              </>
            ) : (
              <>
                <Form method="post" action={location.pathname}>
                  <input type="hidden" name="ignore" value={clickedObject.path} />
                  <button
                    className="btn btn--outlined"
                    type="submit"
                    disabled={state !== "idle"}
                    onClick={() => {
                      isProcessingHideRef.current = true
                      setPath(OneFolderOut(path))
                    }}
                  >
                    <Icon path={mdiEyeOffOutline} />
                    Hide this folder
                  </button>
                </Form>
              </>
            )}
            <button className="btn btn--outlined" onClick={showUnionAuthorsModal}>
              <Icon path={mdiAccountMultiple} />
              Group authors
            </button>
          </div>
        </MenuItem>
        <MenuItem title="Commits">
          <CommitsCard commitCount={commitCount ?? 0} />
        </MenuItem>
      </MenuTab>
    </div>
  )
}

function findObjectInTree(tree: GitTreeObject, object: GitObject | null) {
  if (object === null) return null
  let currentTree = tree
  const steps = object.path.slice(1).split("/")

  for (let i = 0; i < steps.length; i++) {
    for (const child of currentTree.children) {
      if (child.hash === object.hash) return child
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
  return currentTree.path === object.path ? currentTree : null
}

function FileAndSubfolderCountEntries(props: { clickedTree: GitTreeObject }) {
  const folderCount = props.clickedTree.children.filter((child) => child.type === "tree").length
  const fileCount = props.clickedTree.children.length - folderCount

  return (
    <>
      <div className="flex grow items-center overflow-hidden text-ellipsis whitespace-pre text-sm font-semibold">
        Files
      </div>
      <p className="break-all text-sm">{fileCount}</p>
      <div className="flex grow items-center overflow-hidden text-ellipsis whitespace-pre text-sm font-semibold">
        Folders
      </div>
      <p className="break-all text-sm">{folderCount}</p>
    </>
  )
}

function CommitsEntry(props: { count: number | undefined }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden text-ellipsis whitespace-pre text-sm font-semibold">
        Commits
      </div>
      <p className="break-all text-sm">{props.count ?? "unknown"}</p>
    </>
  )
}

function LastchangedEntry(props: { epoch: number | undefined }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden text-ellipsis whitespace-pre text-sm font-semibold">
        Last changed
      </div>
      <p className="break-all text-sm">{props.epoch ? dateFormatLong(props.epoch) : "unknown"}</p>
    </>
  )
}

function PathEntry(props: { path: string }) {
  const { state } = useNavigation()
  const { clickedObject } = useClickedObject()
  if (!clickedObject) return null
  return (
    <>
      <div className="flex grow items-center overflow-hidden text-ellipsis whitespace-pre text-sm font-semibold">
        Located at
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 break-all text-sm">
        <p className="truncate" title={props.path}>
          {props.path}
        </p>
        <Form method="post" action={location.pathname} title={clickedObject.name}>
          <input type="hidden" name="open" value={clickedObject.path} />
          <button className="btn--icon" disabled={state !== "idle"}>
            <Icon
              path={mdiOpenInNew}
              size="1.25em"
              className="w-max"
              title={clickedObject.type === "blob" ? "Open file in default app" : "Browse folder in system explorer"}
            />
          </button>
        </Form>
      </div>
    </>
  )
}

function SizeEntry(props: { size: number; isBinary?: boolean }) {
  const size = byteSize(props.size ?? 0)
  return (
    <>
      <div className="flex items-center overflow-hidden text-ellipsis whitespace-pre text-sm font-semibold">
        Size
      </div>
      <p className="break-all text-sm">
        {size.value} {size.unit}{" "}
        <span className="opacity-50">
          {props.isBinary ? (
            <>
              <br />
              (binary file)
            </>
          ) : null}
        </span>
      </p>
    </>
  )
}

const authorCutoff = 2

function AuthorDistribution(props: {
  authors: { author: string; contribs: number }[] | null
  contribSum: number
  fetcher: Fetcher
}) {
  const authorDistributionExpandId = useId()

  const [collapsed, setCollapsed] = useState<boolean>(true)

  const authorsAreCutoff = (props.authors?.length ?? 0) > authorCutoff + 1
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex justify-between ${authorsAreCutoff ? "cursor-pointer hover:opacity-70" : ""}`}>
        <label className="label grow" htmlFor={authorDistributionExpandId}>
          <h3 className="font-bold">Author distribution</h3>
        </label>
        {authorsAreCutoff ? (
          <ChevronButton id={authorDistributionExpandId} open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-1">
        {props.fetcher.state !== "idle" ? (
          <p>Loading authors...</p>
        ) : (
          <>
            {authorsAreCutoff ? (
              <>
                <AuthorDistFragment
                  show={true}
                  items={props.authors?.slice(0, authorCutoff) ?? []}
                  contribSum={props.contribSum}
                />
                <AuthorDistFragment
                  show={!collapsed}
                  items={props.authors?.slice(authorCutoff) ?? []}
                  contribSum={props.contribSum}
                />
                {collapsed ? (
                  <button
                    className="text-left text-xs opacity-70 hover:opacity-100"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    + {(props.authors?.slice(authorCutoff) ?? []).length} more
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {(props.authors ?? []).length > 0 && hasContributions(props.authors) ? (
                  <AuthorDistFragment show={true} items={props.authors ?? []} contribSum={props.contribSum} />
                ) : (
                  <p>No authors found</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function hasContributions(authors?: { author: string; contribs: number }[] | null) {
  if (!authors) return false
  for (const { contribs } of authors) {
    if (contribs > 0) return true
  }
  return false
}
