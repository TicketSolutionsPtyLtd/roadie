import { type ChartMark, areaY, defineChart, lineY } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import {
  type LinePoint,
  type RangePoint,
  bandMarks,
  forecastMarks,
  targetMark,
  todayMarks
} from '../plot/aids'
import { annotationMarks } from '../plot/annotations'
import {
  type EndLabel,
  endLabelMark,
  endLabelRoom,
  endLabelsFit,
  labelGap,
  stackLabels
} from '../plot/endLabels'
import { type SeriesStyle, seriesMarkId, seriesStyles } from '../plot/series'
import {
  formatTimeTick,
  formatTimeTitle,
  hasTimeOfDay,
  isTimeField,
  parseX,
  timeTicks
} from '../plot/time'
import type {
  ChartDefinition,
  ChartPaint,
  PlotDatum,
  PlotFrame
} from '../plot/types'
import {
  axisFormat,
  finiteOrNull,
  gridTicks,
  labelFormat
} from '../plot/values'
import { describeValue, spokenPoint, trendSentence } from '../plot/words'
import {
  forecastStart,
  hasEnoughPoints,
  isForecast,
  lineXDomain,
  lineYExtent,
  seriesLabel,
  toLinePoints
} from './points'
import { lineChartTable } from './table'
import type { LineChartProps } from './types'

const EMPTY = 'Not enough data yet to show a trend'
const FORECAST_LABEL = 'Forecast'
const TYPICAL_RANGE = 'Typical range'
const DAY = 86_400_000

function styles(
  props: LineChartProps,
  points: readonly PlotDatum[],
  paint: ChartPaint
) {
  const names = [...new Set(points.map((p) => p.series))]
  // A lone series against a band is the story; the band is its context.
  const pacedSeries = props.band && names.length === 1 ? names[0] : undefined
  return seriesStyles(
    names,
    { highlight: props.highlight ?? pacedSeries, palette: props.palette },
    paint
  )
}

// The cone is one range, so it belongs to the story series, or the first.
const coneOwner = (series: readonly SeriesStyle[]) =>
  series.find((s) => s.emphasis === 'highlight') ?? series[0]

function lastValue(points: readonly PlotDatum[], series: string) {
  return points.findLast((p) => p.series === series && p.y !== null)
}

function lastFieldValue(props: LineChartProps, field: string) {
  return props.data
    .map((row) => finiteOrNull(row[field]))
    .findLast((v): v is number => v !== null)
}

function endLabels(
  props: LineChartProps,
  points: readonly PlotDatum[],
  series: readonly SeriesStyle[],
  frame: PlotFrame,
  domain: readonly [number, number]
): EndLabel[] {
  const labels: EndLabel[] = []
  for (const style of series) {
    const last = lastValue(points, style.name)
    if (!last || last.y === null) continue
    const value = labelFormat(props.format, last.y)
    labels.push({
      text:
        isForecast(props, last.x) && series.length === 1
          ? `${FORECAST_LABEL} ${value}`
          : series.length === 1
            ? value
            : style.name,
      y: last.y,
      tone:
        style.emphasis === 'highlight'
          ? 'highlight'
          : style.emphasis === 'context'
            ? 'label'
            : 'value'
    })
  }
  if (props.target !== undefined)
    labels.push({
      text: `Target ${labelFormat(props.format, props.target)}`,
      y: props.target,
      tone: 'value'
    })
  const median = props.band?.median
  const medianEnd = median ? lastFieldValue(props, median) : undefined
  if (medianEnd !== undefined)
    labels.push({
      text: props.band?.label ?? TYPICAL_RANGE,
      y: medianEnd,
      tone: 'label'
    })
  return stackLabels(labels, labelGap(frame, domain))
}

function fieldPoints(props: LineChartProps, field: string): LinePoint[] {
  const isTime = isTimeField(props.data, props.x)
  return props.data
    .map((row) => ({
      x: isTime ? parseX(row[props.x]) : finiteOrNull(row[props.x]),
      y: finiteOrNull(row[field])
    }))
    .filter((p): p is LinePoint => p.x !== null && p.y !== null)
    .sort((a, b) => a.x - b.x)
}

function rangePoints(
  props: LineChartProps,
  low: string,
  high: string
): RangePoint[] {
  const lows = new Map(fieldPoints(props, low).map((p) => [p.x, p.y]))
  return fieldPoints(props, high).map((p) => ({
    x: p.x,
    low: lows.get(p.x) ?? null,
    high: p.y
  }))
}

function seriesMarks(
  props: LineChartProps,
  points: readonly PlotDatum[],
  series: readonly SeriesStyle[],
  yFloor: number
): ChartMark[] {
  const from = forecastStart(props)
  const cone = coneOwner(series)
  return series.flatMap((style) => {
    const own = points.filter((p) => p.series === style.name)
    const solid = own.filter((p) => !isForecast(props, p.x))
    const projected =
      from === null
        ? []
        : own
            .filter((p) => Number(p.x) >= from)
            .map((p) => ({ ...p, x: Number(p.x) }))
    const coneRange =
      style === cone &&
      from !== null &&
      props.forecast?.low &&
      props.forecast.high
        ? rangePoints(props, props.forecast.low, props.forecast.high).filter(
            (r) => r.x >= from
          )
        : []
    const quiet = style.emphasis === 'context' || style.emphasis === 'other'
    const strokeWidth = quiet ? 1.5 : 2
    return [
      ...(props.area && series.length === 1
        ? [
            decorative(
              areaY(solid, {
                id: 'area',
                x: 'x',
                y: 'y',
                y1: yFloor,
                fill: style.color,
                fillOpacity: 0.12
              })
            )
          ]
        : []),
      lineY(solid, {
        id: seriesMarkId(style.slot),
        x: 'x',
        y: 'y',
        z: 'series',
        stroke: style.color,
        strokeWidth,
        lineCap: 'round',
        lineJoin: 'round'
      }),
      ...(projected.length > 1
        ? forecastMarks(projected, coneRange, {
            slot: style.slot,
            color: style.color,
            strokeWidth
          })
        : [])
    ]
  })
}

function todayPoint(
  props: LineChartProps,
  points: readonly PlotDatum[],
  lead: SeriesStyle | undefined
) {
  const x = props.today === undefined ? null : parseX(props.today)
  if (x === null || !lead) return null
  const point = points.find(
    (p) => p.series === lead.name && Number(p.x) === x && p.y !== null
  )
  return point?.y == null
    ? null
    : {
        x,
        y: point.y,
        label: `Today ${labelFormat(props.format, point.y)}`
      }
}

function build(props: LineChartProps, paint: ChartPaint, frame: PlotFrame) {
  const isTime = isTimeField(props.data, props.x)
  const points = toLinePoints(props)
  const xDomain = lineXDomain(points)
  const yDomain = frame.yDomain ?? lineYExtent(props)
  const series = styles(props, points, paint)
  const ends = endLabelsFit(series.length, frame)
    ? endLabels(props, points, series, frame, yDomain)
    : []
  const today = todayPoint(props, points, series[0])
  const format = axisFormat(props.format, yDomain[1])
  const span = xDomain[1] - xDomain[0]
  const band = props.band

  const marks = [
    ...(band
      ? bandMarks(
          rangePoints(props, band.low, band.high),
          band.median ? fieldPoints(props, band.median) : [],
          paint
        )
      : []),
    ...seriesMarks(props, points, series, yDomain[0]),
    ...(props.target === undefined
      ? []
      : [targetMark(props.target, xDomain, paint)]),
    ...(today && series[0]
      ? todayMarks(today, paint, frame, series[0].color)
      : []),
    ...annotationMarks(
      (props.annotations ?? []).flatMap((a) => {
        const x = parseX(a.at)
        return x === null ? [] : [{ x, label: a.label, y: yDomain[1] }]
      }),
      paint,
      frame
    ),
    ...(ends.length ? [endLabelMark(ends, xDomain[1], paint, frame)] : [])
  ]

  return defineChart({
    marks,
    scales: {
      x: {
        scale: scaleLinear().domain(xDomain),
        axis: {
          line: false,
          ticks: {
            ...(isTime && { values: timeTicks(xDomain[0], xDomain[1]) }),
            size: 0,
            format: (value: number) =>
              isTime ? formatTimeTick(value, span) : format(value)
          },
          tickLabels: {
            fontSize: frame.fontSize,
            anchor: ({ value }) =>
              value === xDomain[0]
                ? 'start'
                : value === xDomain[1]
                  ? 'end'
                  : 'middle'
          }
        }
      },
      y: {
        scale: scaleLinear().domain(yDomain),
        grid: { stroke: paint.grid, strokeOpacity: 1 },
        axis: {
          line: false,
          ticks: { values: gridTicks(yDomain), size: 0, format },
          tickLabels: { fontSize: frame.fontSize }
        }
      }
    },
    margin: { right: ends.length ? endLabelRoom(ends, frame) : 8 },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'group-x'
  })
}

export const lineChart: ChartDefinition<LineChartProps> = {
  kind: 'line',
  build,
  table: lineChartTable,
  yExtent: lineYExtent,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const points = toLinePoints(props).filter((p) => p.y !== null)
    const first = points[0]
    const last = points.at(-1)
    if (first?.y == null || last?.y == null)
      return `${seriesLabel(props)} over time`
    const isTime = isTimeField(props.data, props.x)
    const label = (x: number | string) =>
      isTime && typeof x === 'number' ? formatTimeTick(x, 2 * DAY) : String(x)
    return trendSentence({
      noun: seriesLabel(props),
      first: first.y,
      last: last.y,
      from: label(first.x),
      to: label(last.x),
      format: props.format
    })
  },
  emptyMessage: (props) =>
    hasEnoughPoints(toLinePoints(props)) ? undefined : EMPTY,
  legend(props, paint, frame) {
    const series = styles(props, toLinePoints(props), paint)
    if (series.length < 2 || endLabelsFit(series.length, frame)) return []
    return series.map((s) => ({
      label: s.name,
      shape: 'line' as const,
      color: s.color
    }))
  },
  describe(datum, props) {
    const isTime = isTimeField(props.data, props.x)
    const when = spokenPoint(
      datum.x,
      isTime,
      hasTimeOfDay(props.data[0]?.[props.x])
    )
    const value = describeValue(
      datum.y,
      props.format,
      seriesLabel(props).toLowerCase()
    )
    const parts = [
      when,
      value,
      ...(props.series ? [datum.series] : []),
      ...(isForecast(props, datum.x) ? ['forecast'] : [])
    ]
    return parts.join(', ')
  },
  tooltip(data, props, paint) {
    const isTime = isTimeField(props.data, props.x)
    // The solid line and the forecast both hold the point where the forecast starts.
    const rows = data.filter(
      (d, i) => data.findIndex((other) => other.series === d.series) === i
    )
    const first = rows[0]
    const styled = styles(props, toLinePoints(props), paint)
    const title = !first
      ? ''
      : isTime && typeof first.x === 'number'
        ? formatTimeTitle(first.x, hasTimeOfDay(props.data[0]?.[props.x]))
        : String(first.x)
    return {
      title,
      rows: rows.map((d) => ({
        label: isForecast(props, d.x)
          ? `${d.series} ${FORECAST_LABEL.toLowerCase()}`
          : d.series,
        value:
          d.y === null ? 'No data' : formatValue(d.y, props.format ?? 'number'),
        color: styled.find((s) => s.name === d.series)?.color,
        shape: 'line' as const
      }))
    }
  }
}
