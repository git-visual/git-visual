import { useData } from "~/contexts/DataContext"
import { Form, useLocation, useNavigation } from "react-router";
import { mdiEyeOff, mdiEye } from "@mdi/js"
import { ChevronButton } from "./ChevronButton"
import Icon from "@mdi/react"
import { memo, useId, useState } from "react"

function hiddenFileFormat(ignored: string) {
  if (!ignored.includes("/")) return ignored
  const split = ignored.split("/")
  return split[split.length - 1]
}

export const HiddenFiles = memo(function HiddenFiles() {
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const navigationState = useNavigation()
  const { databaseInfo } = useData()
  const expandHiddenFilesButtonId = useId()

  return (
    <div className="card flex flex-col gap-2">
      <h2 className="card__title">
        <button className="flex justify-start gap-2 hover:opacity-70" onClick={() => setExpanded(!expanded)}>
          <Icon path={mdiEyeOff} size="1.25em" />
          Hidden files ({databaseInfo.hiddenFiles.length})
          <ChevronButton id={expandHiddenFilesButtonId} className="absolute right-2 top-2" open={expanded} />
        </button>
      </h2>
      {expanded ? (
        <div>
          {databaseInfo.hiddenFiles.map((hidden) => (
            <div className="grid grid-cols-[auto_1fr] gap-2" key={hidden} title={hidden}>
              <Form className="w-4" method="post" action={location.pathname}>
                <input type="hidden" name="unignore" value={hidden} />
                <button
                  className="btn--icon btn--hover-swap h-4"
                  title="Show file"
                  disabled={navigationState.state !== "idle"}
                >
                  <Icon path={mdiEyeOff} className="inline-block h-full" />
                  <Icon path={mdiEye} className="hover-swap inline-block h-full" />
                </button>
              </Form>
              <span className="text-sm opacity-70">{hiddenFileFormat(hidden)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
})
