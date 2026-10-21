import { areaY, defineChart, lineY } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { OTHER, seriesMarkId, seriesStyles } from '../plot/series'
import { fieldLabel } from '../plot/table'
import { hasTimeOfDay, isTimeField } from '../plot/time'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import {
  axisFormat,
  fullFormat,
  gridTicks,
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

function build(props: StackedAreaProps, paint: ChartPaint, frame: PlotFrame) {
  const layers = stackLayers(props)
  const xDomain = minMax(timesOf(layers))
  const yDomain =
    frame.yDomain ??
    valueDomain(
      layers.map((l) => l.end),
      { zero: true, format: props.format }
    )
  const format = axisFormat(props.format, yDomain[1])
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
    marks,
    scales: {
      x: xAxisScale(props, xDomain, frame),
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
    return `${when}, ${describeValue(datum.y, props.format, noun)}, ${datum.series}`
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
        { label: TOTAL, value: formatValue(total, format) },
        ...here
          .filter((l) => l.y !== 0)
          .reverse()
          .map((l) => ({
            label: l.series,
            value: formatValue(l.y, format),
            color: colours.get(l.series),
            shape: 'swatch' as const
          }))
      ]
    }
  }
}
