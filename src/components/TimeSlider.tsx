import { useSubmit, useNavigation } from "react-router";
import { useMemo, useState } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { dateFormatCalendarHeader, dateFormatShort, getPathFromRepoAndHead } from "~/util"
import ClipLoader from "react-spinners/ClipLoader"
import { Popover, ArrowContainer } from "react-tiny-popover"
import DatePicker from "react-datepicker"
import { Handle, Track } from "./sliderUtils"
import { missingInMapColor, sliderPadding } from "~/const"
import Icon from "@mdi/react"
import { mdiCalendarArrowLeft, mdiCalendarArrowRight } from "@mdi/js"

function DateTags({
  range,
  timerange,
  setRange,
  updateTimeseries,
  disabled
}: {
  range: [number, number]
  timerange: [number, number]
  setRange: React.Dispatch<React.SetStateAction<[number, number]>>
  updateTimeseries(e: readonly number[]): void
  disabled: boolean
}) {
  const [startRangeDatePickerOpen, setStartRangeDatePickerOpen] = useState(false)
  const [endRangeDatePickerOpen, setEndRangeDatePickerOpen] = useState(false)

  const selectedStartDate = useMemo(() => new Date(range[0] * 1000), [range])
  const selectedEndDate = useMemo(() => new Date(range[1] * 1000), [range])
  const percentageStart = useMemo(
    () => ((range[0] - timerange[0]) / (timerange[1] - timerange[0])) * 100,
    [range, timerange]
  )
  const percentageEnd = useMemo(
    () => ((range[1] - timerange[0]) / (timerange[1] - timerange[0])) * 100,
    [range, timerange]
  )

  const railStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: 14,
    borderRadius: 7,
    cursor: "pointer",
    backgroundColor: missingInMapColor
  }

  return (
    <div style={railStyle}>
      <Popover
        isOpen={startRangeDatePickerOpen}
        positions={["top", "left", "right", "bottom"]}
        onClickOutside={() => {
          setStartRangeDatePickerOpen(false)
        }}
        content={({ position, childRect, popoverRect }) => (
          <ArrowContainer
            position={position}
            childRect={childRect}
            popoverRect={popoverRect}
            arrowSize={10}
            arrowColor="white"
          >
            <TimePicker
              range={range}
              setRange={setRange}
              timerange={timerange}
              setsBeginning={true}
              updateTimeseries={updateTimeseries}
              disabled={disabled}
            />
          </ArrowContainer>
        )}
      >
        <button
          title="Set the date of the start of the time range"
          style={{
            left: `${percentageStart}%`,
            bottom: "100%",
            position: "absolute",
            transform: "translate(-100%, -15%)",
            width: "100px",
            whiteSpace: "nowrap"
          }}
          className="btn btn--primary"
          onClick={() => {
            setStartRangeDatePickerOpen(!startRangeDatePickerOpen)
          }}
        >
          <Icon path={mdiCalendarArrowRight} />
          {dateFormatShort(selectedStartDate.getTime())}
        </button>
      </Popover>

      <Popover
        isOpen={endRangeDatePickerOpen}
        positions={["top", "left", "right", "bottom"]}
        onClickOutside={() => {
          setEndRangeDatePickerOpen(false)
        }}
        content={({ position, childRect, popoverRect }) => (
          <ArrowContainer
            position={position}
            childRect={childRect}
            popoverRect={popoverRect}
            arrowSize={10}
            arrowColor="white"
          >
            <TimePicker
              range={range}
              setRange={setRange}
              timerange={timerange}
              setsBeginning={false}
              updateTimeseries={updateTimeseries}
              disabled={disabled}
            />
          </ArrowContainer>
        )}
      >
        <button
          title="Set the date of the end of the time range"
          style={{
            left: `${percentageEnd}%`,
            bottom: "100%",
            position: "absolute",
            transform: "translate(0%, -15%)",
            width: "100px",
            whiteSpace: "nowrap"
          }}
          className="btn btn--primary"
          onClick={() => {
            setEndRangeDatePickerOpen(!endRangeDatePickerOpen)
          }}
        >
          {dateFormatShort(selectedEndDate.getTime())}
          <Icon path={mdiCalendarArrowLeft} />
        </button>
      </Popover>
    </div>
  )
}

function TimePicker({
  range,
  setRange,
  timerange,
  setsBeginning,
  updateTimeseries,
  disabled
}: {
  range: [number, number]
  setRange: React.Dispatch<React.SetStateAction<[number, number]>>
  timerange: [number, number]
  setsBeginning: boolean
  updateTimeseries(e: readonly number[]): void
  disabled: boolean
}) {
  return (
    <div>
      <DatePicker
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled
        }) => {
          return (
            <div className="m-2 flex justify-between">
              <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
                {"<"}
              </button>
              <h2>{dateFormatCalendarHeader(date.getTime())}</h2>
              <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
                {">"}
              </button>
            </div>
          )
        }}
        inline
        fixedHeight
        disabled={disabled}
        selected={new Date(range[setsBeginning ? 0 : 1] * 1000)}
        minDate={new Date(setsBeginning ? timerange[0] * 1000 : Math.max(timerange[0] * 1000, range[0] * 1000))}
        maxDate={new Date(setsBeginning ? Math.min(timerange[1] * 1000, range[1] * 1000) : timerange[1] * 1000)}
        onChange={(x) => {
          if (x) {
            let newRange: [number, number]
            if (setsBeginning) {
              newRange = [x.getTime() / 1000, range[1]]
            } else {
              newRange = [range[0], x.getTime() / 1000]
            }
            setRange(newRange)
            updateTimeseries(newRange)
          }
        }}
      />
    </div>
  )
}

export default function TimeSlider() {
  const sliderStyle: React.CSSProperties = {
    left: sliderPadding / 2,
    top: "30px",
    position: "relative",
    width: `calc(100% - ${sliderPadding}px)`
  }

  const { databaseInfo } = useData()
  const { timerange, selectedRange } = databaseInfo
  const submit = useSubmit()
  const [range, setRange] = useState(selectedRange[0] === 0 ? timerange : selectedRange)

  const navigationData = useNavigation()
  const disabled = navigationData.state !== "idle"

  function updateTimeseries(e: readonly number[]) {
    const form = new FormData()
    form.append("timeseries", `${e[0]}-${e[1]}`)
    submit(form, {
      action: `/${getPathFromRepoAndHead(databaseInfo.repo, databaseInfo.branch)}`,
      method: "post"
    })
  }

  return (
    <div style={{ height: 60, width: "100%", textAlign: "center" }}>
      <Slider
        mode={2}
        step={1}
        domain={timerange}
        rootStyle={sliderStyle}
        onUpdate={(e) => setRange([...e] as [number, number])}
        onChange={(e) => {
          updateTimeseries(e)
        }}
        values={range}
        disabled={disabled}
      >
        <Rail>
          {() => (
            <>
              <DateTags
                setRange={setRange}
                timerange={timerange}
                range={range}
                updateTimeseries={updateTimeseries}
                disabled={disabled}
              />
              <div
                style={{
                  left: "-50px",
                  top: "-8px",
                  position: "absolute"
                }}
              >
                <ClipLoader title="Loading selected time range" size={30} loading={disabled} color="#7aa0c4" />
              </div>
            </>
          )}
        </Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div className="slider-handles">
              {handles.map((handle) => (
                <Handle
                  key={handle.id}
                  handle={handle}
                  domain={timerange}
                  getHandleProps={getHandleProps}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </Handles>
        <Tracks left={false} right={false}>
          {({ tracks, getTrackProps }) => (
            <div className="slider-tracks">
              {tracks.map(({ id, source, target }) => (
                <Track
                  backgroundColor="#7aa0c4"
                  key={id}
                  source={source}
                  target={target}
                  getTrackProps={getTrackProps}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </Tracks>
      </Slider>
    </div>
  )
}
