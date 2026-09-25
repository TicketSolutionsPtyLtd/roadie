import type { PlotCell, TableRow } from '@oztix/roadie-core/dashboard'
import { type ValueFormat, formatValue } from '@oztix/roadie-core/dataviz'

import type { ChartTable } from '../Chart'
import { valueColumn, xCell, xColumn } from '../plot/table'
import { isTimeField, parseX } from '../plot/time'
import { finiteOrNull, fullFormat } from '../plot/values'
import { isForecast, seriesLabel, toLinePoints } from './points'
import type { LineChartProps } from './types'

const FORECAST = 'Forecast'
// A cell that doesn't apply, such as a forecast before it starts, stays blank.
const NOT_APPLICABLE = ''

function rangeText(low: PlotCell, high: PlotCell, format?: ValueFormat) {
  const from = finiteOrNull(low)
  const to = finiteOrNull(high)
  if (from === null || to === null) return null
  const shown = fullFormat(format)
  return `${formatValue(from, shown)} to ${formatValue(to, shown)}`
}

export function lineChartTable(props: LineChartProps): ChartTable {
  const isTime = isTimeField(props.data, props.x)
  const points = toLinePoints(props)
  const series = [...new Set(points.map((p) => p.series))]
  const keyOf = (name: string) => (props.series ? name : props.y)
  const forecastHeader = (name: string) =>
    props.series ? `${name} forecast` : FORECAST
  const forecasting = series.filter((name) =>
    points.some((p) => p.series === name && isForecast(props, p.x))
  )
  const band = props.band
  const bandLabel = band?.label ?? 'Typical range'
  const columns = [
    xColumn(props.x),
    ...series.map((name) => valueColumn(keyOf(name), name, props.format)),
    ...forecasting.map((name) =>
      valueColumn(forecastHeader(name), forecastHeader(name), props.format)
    ),
    ...(band
      ? [
          ...(band.median
            ? [valueColumn('bandMedian', bandLabel, props.format)]
            : []),
          valueColumn('bandRange', `${bandLabel} range`, props.format)
        ]
      : [])
  ]
  const byX = new Map<number | string, TableRow>()
  for (const row of props.data) {
    const raw = row[props.x] ?? null
    const x = isTime ? parseX(raw) : raw
    if (x === null) continue
    const cells = byX.get(x) ?? { [props.x]: xCell(raw, isTime) }
    byX.set(x, cells)
    if (band) {
      cells.bandRange = rangeText(
        row[band.low] ?? null,
        row[band.high] ?? null,
        props.format
      )
      if (band.median) cells.bandMedian = row[band.median] ?? null
    }
  }
  for (const p of points) {
    const cells = byX.get(p.x)
    if (!cells) continue
    const actual = keyOf(p.series)
    const projected = forecastHeader(p.series)
    const [key, other] = isForecast(props, p.x)
      ? [projected, actual]
      : [actual, projected]
    cells[key] = p.y
    if (forecasting.includes(p.series)) cells[other] ??= NOT_APPLICABLE
  }
  return {
    columns,
    rows: [...byX.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, row]) => row)
  }
}

export { seriesLabel }
