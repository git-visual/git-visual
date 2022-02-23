import { Metric, MetricType } from "../metrics"
import { Box } from "./util"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType } from "./BubbleChart"
import { useStore } from "../StoreContext"
import { Spacer } from "./Spacer"

export function Options() {
  const { setMetricType, setChartType } = useStore()
  return (
    <Box>
      <EnumSelect
        label="Chart type"
        enum={Chart}
        onChange={(chartType: ChartType) => setChartType(chartType)}
      />
      <Spacer />
      <EnumSelect
        label="Color metric"
        enum={Metric}
        onChange={(metric: MetricType) => setMetricType(metric)}
      ></EnumSelect>
    </Box>
  )
}
