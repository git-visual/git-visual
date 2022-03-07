import { useEffect, useState, useMemo } from "react"
import {
  getMetricCalcs,
  MetricCache,
  MetricType,
  setupMetricsCache,
} from "./../metrics"
import {
  ChartType,
  getDefaultOptions,
  Options,
  OptionsContext,
} from "../OptionsContext"
import { SearchContext } from "./../SearchContext"
import { HydratedGitBlobObject, ParserData } from "../../../parser/src/model"
import { MetricContext } from "../MetricContext"
import { DataContext } from "./DataContext"

export function Providers({ children }: { children: React.ReactNode }) {
  const [dataState, setData] = useState<{
    data: ParserData | null
    metricCaches: Map<MetricType, MetricCache> | null
    errorMessage: string | null
  }>({ data: null, metricCaches: null, errorMessage: null })
  const [store, setStore] = useState<Options | null>(null)
  const [searchText, setSearchText] = useState("")

  useEffect(() => {
    async function getData() {
      try {
        const response = await fetch(`./data.json?cache_bust${Date.now()}`)
        const data = (await response.json()) as ParserData
        const metricCaches = new Map<MetricType, MetricCache>()
        setupMetricsCache(
          data.commit.tree,
          getMetricCalcs(data.commit),
          metricCaches
        )
        setData({ data, metricCaches, errorMessage: null })
      } catch (e) {
        setData({
          data: null,
          metricCaches: null,
          errorMessage: (e as Error).message,
        })
      }
    }
    getData()
  }, [])

  useEffect(() => {
    if (!dataState) {
      setStore(null)
      return
    }
    setStore((prevStore) => ({
      ...(prevStore ?? getDefaultOptions()),
      ...dataState,
    }))
  }, [dataState])

  const storeValue = useMemo(
    () => ({
      ...getDefaultOptions(),
      ...store,
      setMetricType: (metricType: MetricType) =>
        setStore((prevStore) => ({
          ...(prevStore ?? getDefaultOptions()),
          metricType,
        })),
      setChartType: (chartType: ChartType) =>
        setStore((prevStore) => ({
          ...(prevStore ?? getDefaultOptions()),
          chartType,
        })),
      setHoveredBlob: (blob: HydratedGitBlobObject | null) =>
        setStore((prevStore) => ({
          ...(prevStore ?? getDefaultOptions()),
          hoveredBlob: blob,
        })),
      setClickedBlob: (blob: HydratedGitBlobObject | null) =>
        setStore((prevStore) => ({
          ...(prevStore ?? getDefaultOptions()),
          clickedBlob: blob,
        })),
    }),
    [store]
  )

  const { data, metricCaches, errorMessage } = dataState

  if (data === null || metricCaches === null) {
    if (errorMessage === null) {
      return <div>Loading...</div>
    } else {
      return <div>{dataState.errorMessage}</div>
    }
  }

  return (
    <DataContext.Provider value={data}>
      <MetricContext.Provider value={metricCaches}>
        <OptionsContext.Provider value={storeValue}>
          <SearchContext.Provider value={{ searchText, setSearchText }}>
            {children}
          </SearchContext.Provider>
        </OptionsContext.Provider>
      </MetricContext.Provider>
    </DataContext.Provider>
  )
}
