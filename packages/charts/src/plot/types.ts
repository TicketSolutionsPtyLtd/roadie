import type { ChartValue, StaticChartDefinition } from '@tanstack/charts'

import type { ChartPlotKind, PlotRow } from '@oztix/roadie-core/dashboard'
import type { StatusName } from '@oztix/roadie-core/dataviz'

import type { ChartTable } from '../Chart'
import type { ChartLegendItem } from '../ChartLegend'
import type { ChartTooltipRow } from '../ChartTooltip'

// The bare type's tooltip host defaults to string, which <Chart> rejects.
export type EngineDefinition = StaticChartDefinition<
  unknown,
  ChartValue,
  ChartValue,
  'dom'
>

export type Row = PlotRow
export type WidthBand = 'narrow' | 'default' | 'wide'

export type PlotFrame = {
  height: number
  width: number
  band: WidthBand
  fontSize: number
  yDomain?: readonly [number, number]
}

export type PlotDatum = {
  x: number | string
  y: number | null
  series: string
  index: number
}

export type ChartPaint = {
  highlight: string
  context: string
  other: string
  missing: string
  median: string
  band: string
  bandOpacity: number
  categorical: readonly string[]
  pair: readonly string[]
  trio: readonly string[]
  heat: readonly string[]
  diverging: readonly string[]
  status: Readonly<Record<StatusName, string>>
  grid: string
  axis: string
  label: string
  value: string
  surface: string
}

export type TooltipContent = {
  title: string
  rows: readonly ChartTooltipRow[]
}

export type CategoryAxis = 'x' | 'y'

export type ChartDefinition<P> = {
  kind: ChartPlotKind
  build: (props: P, paint: ChartPaint, frame: PlotFrame) => EngineDefinition
  table: (props: P) => ChartTable
  summary: (props: P) => string
  emptyMessage: (props: P) => string | undefined
  legend: (
    props: P,
    paint: ChartPaint,
    frame: PlotFrame
  ) => readonly ChartLegendItem[]
  describe: (datum: PlotDatum, props: P) => string
  tooltip: (
    data: readonly PlotDatum[],
    props: P,
    paint: ChartPaint
  ) => TooltipContent
  yExtent?: (props: P) => readonly [number, number]
  /** The axis categories run along; 'y' for horizontal bars. @default 'x' */
  categoryAxis?: (props: P) => CategoryAxis
}

export function isPlotDatum(value: unknown): value is PlotDatum {
  return (
    typeof value === 'object' &&
    value !== null &&
    'series' in value &&
    'index' in value &&
    'x' in value &&
    'y' in value
  )
}
