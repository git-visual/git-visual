import { mdiChevronDown } from "@mdi/js"
import Icon from "@mdi/react"
import type { HTMLAttributes } from "react"

export function ChevronButton({
  onClick = () => void 0,
  open,
  className = "",
  ...props
}: { onClick?: () => void; open: boolean } & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`z-10 ${className}`} onClick={onClick} {...props}>
      <Icon path={mdiChevronDown} size={1} className={`chevron transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  )
}
