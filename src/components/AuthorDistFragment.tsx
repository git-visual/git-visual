import { Fragment } from "react"
import { useMetrics } from "~/contexts/MetricContext"
import { LegendDot } from "./util"

interface AuthorDistFragProps {
  items: { author: string; contribs: number }[]
  show: boolean
  contribSum: number
}

export function AuthorDistFragment(props: AuthorDistFragProps) {
  const [, authorColors] = useMetrics()

  if (!props.show) return null

  return (
    <>
      {props.items.map((legendItem) => {
        const contrib = legendItem.contribs
        const author = legendItem.author
        const roundedContrib = Math.round((contrib / props.contribSum) * 100)
        const contribPercentage = roundedContrib === 0 ? "<1" : roundedContrib
        return (
          <Fragment key={author + contrib}>
            <div
              className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-pre text-sm font-semibold"
              title={author}
            >
              <LegendDot authorColorToChange={author} className="ml-1" dotColor={authorColors.get(author) ?? "grey"} />
              <span className="overflow-hidden text-ellipsis whitespace-pre font-bold opacity-80">{author}</span>
            </div>
            <p className="break-all text-right text-sm">{contribPercentage}%</p>
          </Fragment>
        )
      })}
    </>
  )
}
