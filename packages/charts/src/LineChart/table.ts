import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { valueColumn, xCell, xColumn } from '../plot/table'
import { isTimeField, parseX } from '../plot/time'
import { seriesLabel, toLinePoints } from './points'
import type { LineChartProps } from './types'

const FORECAST = 'Forecast'

export function lineChartTable(props: LineChartProps): ChartTable {
  const isTime = isTimeField(props.data, props.x)
  const points = toLinePoints(props)
  const series = [...new Set(points.map((p) => p.series))]
  const keyOf = (name: string) => (props.series ? name : props.y)
  const lead = series[0]
  const from = props.forecast ? parseX(props.forecast.from) : null
  const band = props.band
  const bandLabel = band?.label ?? 'Typical range'
  const columns = [
    xColumn(props.x),
    ...series.map((name) => valueColumn(keyOf(name), name, props.format)),
    ...(from === null ? [] : [valueColumn(FORECAST, FORECAST, props.format)]),
    ...(band
      ? [
          valueColumn('bandLow', `${bandLabel} low`, props.format),
          valueColumn('bandHigh', `${bandLabel} high`, props.format),
          ...(band.median
            ? [valueColumn('bandMedian', `${bandLabel} median`, props.format)]
            : [])
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
      cells.bandLow = row[band.low] ?? null
      cells.bandHigh = row[band.high] ?? null
      if (band.median) cells.bandMedian = row[band.median] ?? null
    }
  }
  for (const p of points) {
    const cells = byX.get(p.x)
    if (!cells) continue
    const isForecast = from !== null && p.series === lead && Number(p.x) > from
    cells[isForecast ? FORECAST : keyOf(p.series)] = p.y
  }
  return {
    columns,
    rows: [...byX.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, row]) => row)
  }
}

export { seriesLabel }
