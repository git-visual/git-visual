/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import type { AccordionData } from "./Accordion"
import clsx from "clsx"

function AccordionItem({
  data,
  isOpen,
  btnOnClick,
  titleLabels
}: {
  data: AccordionData
  isOpen: boolean
  btnOnClick: () => void
  titleLabels?: boolean
}) {
  const afterStyle =
    "after:content-[''] after:shrink-0 after:w-[14px] after:h-[14px] after:ml-auto after:transition-[transform] after:duration-[200ms] after:ease-out after:bg-[length:14px_14px] after:bg-no-repeat after:bg-arrow"
  return (
    <li className="border-0">
      <h2 className="m-0 w-full hover:opacity-70">
        <div
          className={clsx("b-0 flex w-full cursor-pointer items-center" + afterStyle, {
            "text-[16px] font-semibold": titleLabels,
            "text-[14px] font-normal": !titleLabels,
            "after:-rotate-180": isOpen,
            "after:rotate-0": !isOpen
          })}
          onClick={btnOnClick}
          title={data.title}
        >
          {data.title}
        </div>
      </h2>
      <ul
        className="m-0 block p-0 text-sm transition-[height] duration-[200ms] ease-out"
        style={{ height: isOpen ? "auto" : "0" }}
      >
        {isOpen && <div>{data.content}</div>}
      </ul>
    </li>
  )
}

export default AccordionItem
