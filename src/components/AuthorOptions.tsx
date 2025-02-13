import { mdiAccountMultiple, mdiDiceMultipleOutline } from "@mdi/js"
import Icon from "@mdi/react"
import { Form, useNavigation } from "react-router";
import { useState } from "react"
import { Slider, Rail, Handles, Tracks, Ticks, type SliderItem } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { useOptions } from "~/contexts/OptionsContext"
import { getPathFromRepoAndHead } from "~/util"
import { Handle, Track } from "./sliderUtils"
import { noEntryColor } from "~/const"

interface TickProps {
  tick: SliderItem
  count: number
}

function Tick({ tick, count }: TickProps) {
  let text = ""
  let align: "left" | "center" | "right" = "center"

  switch (tick.value) {
    case 0:
      text = "Top author"
      align = "right"
      break
    case 50:
      text = "Majority author"
      align = "center"
      break
    case 100:
      text = "Single author"
      align = "left"
  }

  return (
    <div>
      <div
        style={{
          position: "absolute",
          marginTop: 14,
          width: 1,
          height: 5,
          backgroundColor: "rgb(150,150,150)",
          left: `${tick.percent}%`
        }}
      />
      <div
        style={{
          position: "absolute",
          marginTop: 22,
          fontSize: 10,
          textAlign: align,
          marginLeft: `${-(100 / count) / 2}%`,
          width: `${100 / count}%`,
          left: `${tick.percent}%`,
          maxWidth: "80px"
        }}
      >
        {text}
      </div>
    </div>
  )
}

function PercentageSlider() {
  const { dominantAuthorCutoff, setDominantAuthorCutoff } = useOptions()
  const [displayPercentage, setDisplayPercentage] = useState(dominantAuthorCutoff)

  const sliderStyle: React.CSSProperties = {
    position: "relative",
    left: "43px",
    top: "7px",
    width: "calc(100% - 55px)",
    zIndex: "0"
  }

  const railStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: 14,
    borderRadius: 7,
    cursor: "pointer",
    backgroundColor: "#7aa0c4"
  }

  const domain = [0, 100]
  return (
    <>
      <Slider
        mode={1}
        step={1}
        domain={domain}
        rootStyle={sliderStyle}
        onChange={(e) => {
          setDominantAuthorCutoff(e[0])
          setDisplayPercentage(e[0])
        }}
        onUpdate={(e) => {
          setDisplayPercentage(e[0])
        }}
        values={[displayPercentage]}
      >
        <Rail>{({ getRailProps }) => <div style={railStyle} {...getRailProps()} />}</Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div className="slider-handles">
              {handles.map((handle) => (
                <Handle key={handle.id} handle={handle} domain={domain} getHandleProps={getHandleProps} />
              ))}
            </div>
          )}
        </Handles>
        <Tracks right={false}>
          {({ tracks, getTrackProps }) => (
            <div className="slider-tracks">
              {tracks.map(({ id, source, target }) => (
                <Track
                  backgroundColor={noEntryColor}
                  key={id}
                  source={source}
                  target={target}
                  getTrackProps={getTrackProps}
                />
              ))}
            </div>
          )}
        </Tracks>
        <Ticks count={3}>
          {({ ticks }) => (
            <div className="slider-ticks">
              {ticks.map((tick) => (
                <Tick key={tick.id} tick={tick} count={ticks.length} />
              ))}
            </div>
          )}
        </Ticks>
      </Slider>
      <p>{displayPercentage}%</p>
    </>
  )
}

export function AuthorOptions({ showUnionAuthorsModal }: { showUnionAuthorsModal: () => void }) {
  const transitionState = useNavigation()
  const { repo } = useData()
  const { metricType } = useOptions()

  if (metricType !== "TOP_CONTRIBUTOR") return null

  return (
    <>
      <PercentageSlider />
      <div className="mt-2 flex gap-2">
        <button className="btn" onClick={showUnionAuthorsModal}>
          <Icon path={mdiAccountMultiple} />
          Group authors
        </button>
        <Form method="post" action={`/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`}>
          <input type="hidden" name="rerollColors" value="" />
          <button className="btn" type="submit" disabled={transitionState.state !== "idle"}>
            <Icon path={mdiDiceMultipleOutline} />
            New author colors
          </button>
        </Form>
      </div>
    </>
  )
}
