import type { PlotX } from '@oztix/roadie-core/dashboard'

import { OTHER, rollupOther, seriesNames } from '../plot/series'
import { fieldLabel } from '../plot/table'
import { isTimeField, parseX } from '../plot/time'
import type { PlotDatum, Row } from '../plot/types'
import { finiteOrNull, valueDomain } from '../plot/values'
import type { LineChartProps } from './types'

export const MIN_POINTS = 2

const xOf = (value: PlotX | Row[string] | undefined, isTime: boolean) =>
  isTime ? parseX(value) : finiteOrNull(value)

export function seriesLabel(props: Pick<LineChartProps, 'y'>) {
  return fieldLabel(props.y)
}

/** Every series' points in x order, before the smallest roll into Other. */
export function linePoints(props: LineChartProps): PlotDatum[] {
  const isTime = isTimeField(props.data, props.x)
  const fallback = seriesLabel(props)
  const names = seriesNames(props.data, props.series, fallback)
  const points: PlotDatum[] = []
  props.data.forEach((row, index) => {
    const x = xOf(row[props.x], isTime)
    if (x === null) return
    const series = props.series ? String(row[props.series] ?? '') : fallback
    if (!names.includes(series)) return
    points.push({ x, y: finiteOrNull(row[props.y]), series, index })
  })
  points.sort((a, b) => Number(a.x) - Number(b.x))
  const running = new Map<string, number>()
  const accumulated = props.cumulative
    ? points.map((p) => {
        if (p.y === null) return p
        const total = (running.get(p.series) ?? 0) + p.y
        running.set(p.series, total)
        return { ...p, y: total }
      })
    : points
  return accumulated
}

export const toLinePoints = (props: LineChartProps): PlotDatum[] =>
  rollupOther(linePoints(props))

export function lineXDomain(points: readonly PlotDatum[]): [number, number] {
  const xs = points.map((p) => Number(p.x))
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1]
}

export function forecastStart(props: Pick<LineChartProps, 'forecast'>) {
  return props.forecast ? parseX(props.forecast.from) : null
}

export function isForecast(
  props: Pick<LineChartProps, 'forecast'>,
  x: number | string
) {
  const from = forecastStart(props)
  return from !== null && Number(x) > from
}

export function lineYExtent(props: LineChartProps): readonly [number, number] {
  const values = toLinePoints(props).map((p) => p.y)
  const { band, forecast } = props
  const rangeFields = [
    ...(band ? [band.low, band.high] : []),
    ...(forecast?.low && forecast.high ? [forecast.low, forecast.high] : [])
  ]
  const extra = [
    ...props.data.flatMap((row) =>
      rangeFields.map((field) => finiteOrNull(row[field]))
    ),
    ...(props.target === undefined ? [] : [props.target])
  ]
  return valueDomain([...values, ...extra], { zero: props.format !== 'index' })
}

export const hasEnoughPoints = (points: readonly PlotDatum[]) =>
  [...new Set(points.map((p) => p.series))].some(
    (series) =>
      points.filter((p) => p.series === series && p.y !== null).length >=
      MIN_POINTS
  )

export { OTHER }
