import { areaY, defineChart, lineY } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { placeTodayLabel, todayMarks } from '../plot/aids'
import { annotationMarks, annotationsOnAxis } from '../plot/annotations'
import { plotSpan } from '../plot/endLabels'
import { OTHER, seriesMarkId, seriesStyles } from '../plot/series'
import { fieldLabel } from '../plot/table'
import { hasTimeOfDay, isTimeField, parseX } from '../plot/time'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import {
  axisFormat,
  fullFormat,
  gridTicks,
  labelFormat,
  minMax,
  valueDomain
} from '../plot/values'
import { describeValue, spokenPoint } from '../plot/words'
import { xAxisScale, xTitle } from '../plot/xAxis'
import { type Layer, stackLayers, stackOrder } from './stack'
import { stackedAreaTable } from './table'
import type { StackedAreaProps } from './types'

const EMPTY = 'Not enough data yet to show a trend'
const TOTAL = 'Total'
// Opaque enough to tell bands apart, with each top edge drawn solid over it.
const BAND_OPACITY = 0.3

const styles = (props: StackedAreaProps, paint: ChartPaint) =>
  seriesStyles(
    stackOrder(props),
    { highlight: props.highlight, palette: props.palette },
    paint
  )

const timesOf = (layers: readonly Layer[]) => [
  ...new Set(layers.map((l) => l.x))
]

const percent = (value: number) => formatValue(value, 'percent')

// The top of the stack, which reads as the total at that time.
function todayPoint(props: StackedAreaProps, layers: readonly Layer[]) {
  const x = props.today === undefined ? null : parseX(props.today)
  const here = layers.filter((l) => l.x === x)
  const top = here.at(-1)
  if (x === null || !top) return null
  const total = here.reduce((sum, l) => sum + l.y, 0)
  return { x, y: top.end, label: `Today ${labelFormat(props.format, total)}` }
}

function build(props: StackedAreaProps, paint: ChartPaint, frame: PlotFrame) {
  const layers = stackLayers(props)
  const share = props.mode === 'share'
  const xDomain = minMax(timesOf(layers))
  const yDomain: readonly [number, number] = share
    ? [0, 1]
    : (frame.yDomain ??
      valueDomain(
        layers.map((l) => l.end),
        { zero: true, format: props.format }
      ))
  const format = share ? percent : axisFormat(props.format, yDomain[1])
  const yTicks = gridTicks(yDomain)
  const pixels = plotSpan(frame, yTicks.map(format), 8)
  const span = xDomain[1] - xDomain[0]
  const across = (x: number) => (span > 0 ? (x - xDomain[0]) / span : 0)
  const today = todayPoint(props, layers)
  const todayLabel =
    today && placeTodayLabel(today, pixels, across, yDomain, frame)
  const marks = styles(props, paint).flatMap((style) => {
    const own = layers.filter((l) => l.series === style.name)
    const quiet = style.emphasis === 'context' || style.emphasis === 'other'
    return [
      decorative(
        areaY(own, {
          id: `${seriesMarkId(style.slot)}-area`,
          x: 'x',
          y1: 'start',
          y2: 'end',
          fill: style.color,
          fillOpacity: BAND_OPACITY
        })
      ),
      lineY(own, {
        id: seriesMarkId(style.slot),
        x: 'x',
        y: 'end',
        z: 'series',
        stroke: style.color,
        strokeWidth: quiet ? 1.5 : 2,
        lineCap: 'round',
        lineJoin: 'round'
      })
    ]
  })
  return defineChart({
    marks: [
      ...marks,
      ...(today && todayLabel
        ? todayMarks(today, paint, frame, paint.value, { dx: todayLabel.dx })
        : []),
      ...annotationMarks(
        annotationsOnAxis(
          props.annotations,
          xDomain,
          isTimeField(props.data, props.x),
          yDomain[1]
        ),
        paint,
        frame,
        pixels,
        todayLabel?.box ?? null
      )
    ],
    scales: {
      x: xAxisScale(props, xDomain, frame),
      y: {
        scale: scaleLinear().domain(yDomain),
        grid: { stroke: paint.grid, strokeOpacity: 1 },
        axis: {
          line: false,
          ticks: { values: yTicks, size: 0, format },
          tickLabels: { fontSize: frame.fontSize }
        }
      }
    },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'group-x'
  })
}

function largestOverall(layers: readonly Layer[]) {
  const totals = new Map<string, number>()
  for (const l of layers)
    if (l.series !== OTHER)
      totals.set(l.series, (totals.get(l.series) ?? 0) + l.y)
  return [...totals].reduce<[string, number] | undefined>(
    (best, entry) => (best && best[1] >= entry[1] ? best : entry),
    undefined
  )?.[0]
}

export const stackedArea: ChartDefinition<StackedAreaProps> = {
  kind: 'stacked-area',
  build,
  table: stackedAreaTable,
  rangeAxis(props) {
    if (!isTimeField(props.data, props.x)) return null
    return {
      values: timesOf(stackLayers(props)),
      msOf: Number,
      options: { hasTime: hasTimeOfDay(props.data[0]?.[props.x]) }
    }
  },
  summary(props) {
    if (props.takeaway) return props.takeaway
    const largest = largestOverall(stackLayers(props))
    const kind = fieldLabel(props.series).toLowerCase()
    return largest
      ? `${largest} is the largest ${kind} overall`
      : `${fieldLabel(props.y)} by ${kind}`
  },
  emptyMessage: (props) =>
    timesOf(stackLayers(props)).length < 2 ? EMPTY : undefined,
  legend: (props, paint) =>
    styles(props, paint)
      .map((s) => ({
        label: s.name,
        shape: 'swatch' as const,
        color: s.color,
        slot: s.slot
      }))
      .reverse(),
  describe(datum, props) {
    const when = spokenPoint(
      datum.x,
      isTimeField(props.data, props.x),
      hasTimeOfDay(props.data[0]?.[props.x]),
      props.xFormat
    )
    const noun = fieldLabel(props.y).toLowerCase()
    const base = `${when}, ${describeValue(datum.y, props.format, noun)}, ${datum.series}`
    if (props.mode !== 'share') return base
    const layer = stackLayers(props).find(
      (l) => l.x === datum.x && l.series === datum.series
    )
    return layer ? `${base}, ${percent(layer.share)} of the total` : base
  },
  tooltip(data, props, paint) {
    const x = data[0]?.x
    const colours = new Map(styles(props, paint).map((s) => [s.name, s.color]))
    const format = fullFormat(props.format)
    const here = stackLayers(props).filter((l) => l.x === x)
    const total = here.reduce((sum, l) => sum + l.y, 0)
    return {
      title: x === undefined ? '' : xTitle(props, x),
      rows: [
        { label: TOTAL, value: formatValue(total, format), shape: 'none' },
        ...here
          .filter((l) => l.y !== 0)
          .reverse()
          .map((l) => ({
            label: l.series,
            value:
              props.mode === 'share'
                ? `${percent(l.share)} (${formatValue(l.y, format)})`
                : formatValue(l.y, format),
            color: colours.get(l.series),
            shape: 'swatch' as const
          }))
      ]
    }
  }
}
