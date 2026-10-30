import type {
  PlotCell,
  TableColumn,
  TableRow
} from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { valueColumn, xCell, xColumn } from '../plot/table'
import { isTimeField, parseX } from '../plot/time'
import { type ValueStyle, finiteOrNull, fullValue } from '../plot/values'
import {
  comparisonLabel,
  comparisonPoints,
  isForecast,
  linePoints,
  seriesLabel
} from './points'
import type { LineChartProps } from './types'

const FORECAST = 'Forecast'
const NOT_APPLICABLE = ''

function rangeText(low: PlotCell, high: PlotCell, style: ValueStyle) {
  const from = finiteOrNull(low)
  const to = finiteOrNull(high)
  if (from === null || to === null) return null
  return `${fullValue(style, from)} to ${fullValue(style, to)}`
}

export function lineChartTable(props: LineChartProps): ChartTable {
  const isTime = isTimeField(props.data, props.x)
  // Every series keeps its own column, including those the plot rolls into Other.
  const points = linePoints(props)
  const series = [...new Set(points.map((p) => p.series))]
  const keyOf = (name: string) => (props.series ? name : props.y)
  const forecastHeader = (name: string) =>
    props.series ? `${name} forecast` : FORECAST
  const forecasting = series.filter((name) =>
    points.some((p) => p.series === name && isForecast(props, p.x))
  )
  const band = props.band
  const bandLabel = band?.label ?? 'Typical range'
  const compared = comparisonPoints(props)
  const comparison = compared.length ? props.comparison : undefined
  const columns = [
    xColumn(props.x),
    ...series.map((name) => valueColumn(keyOf(name), name, props)),
    ...forecasting.map((name) =>
      valueColumn(forecastHeader(name), forecastHeader(name), props)
    ),
    ...(comparison
      ? [
          valueColumn(
            comparison.y,
            comparisonLabel(props) ?? comparison.y,
            props
          )
        ]
      : []),
    ...(band
      ? [
          ...(band.median ? [valueColumn('bandMedian', bandLabel, props)] : []),
          // Formatted text, which DataTable mutes and aligns like the values.
          {
            key: 'bandRange',
            header: `${bandLabel} range`,
            kind: 'number'
          } satisfies TableColumn
        ]
      : [])
  ]
  const byX = new Map<number | string, TableRow>()
  for (const row of props.data) {
    const raw = row[props.x] ?? null
    const x = isTime ? parseX(raw) : raw
    if (x === null) continue
    const cells = byX.get(x) ?? {
      [props.x]: xCell(raw, isTime, props.xFormat)
    }
    byX.set(x, cells)
    if (band) {
      cells.bandRange = rangeText(
        row[band.low] ?? null,
        row[band.high] ?? null,
        props
      )
      if (band.median) cells.bandMedian = row[band.median] ?? null
    }
  }
  if (comparison)
    for (const p of compared) {
      const cells = byX.get(p.x)
      if (cells) cells[comparison.y] = p.y
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
