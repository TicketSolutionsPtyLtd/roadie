import { defineChart, rect, ruleX, text } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { seriesMarkId } from '../plot/series'
import { fieldLabel } from '../plot/table'
import type {
  ChartDefinition,
  ChartPaint,
  PlotDatum,
  PlotFrame
} from '../plot/types'
import {
  axisFormat,
  fullFormat,
  gridTicks,
  isCountFormat,
  labelFormat,
  valueDomain
} from '../plot/values'
import { nounFor } from '../plot/words'
import { type Bin, binValues, histogramValues, medianOf } from './bin'
import { binLabel, histogramTable } from './table'
import type { HistogramProps } from './types'

const EMPTY = 'Not enough data yet to show a spread'
const MAX_X_TICKS: Record<PlotFrame['band'], number> = {
  narrow: 4,
  default: 6,
  wide: 8
}

const unitOf = (props: HistogramProps) => fieldLabel(props.x).toLowerCase()

// Money and shares carry their own units; counts take the field's noun.
const withUnit = (props: HistogramProps, text: string, count: number) =>
  isCountFormat(props.format)
    ? `${text} ${nounFor(count, unitOf(props))}`
    : text

const valueText = (props: HistogramProps, value: number) =>
  withUnit(props, formatValue(value, fullFormat(props.format)), value)

/** "1 ticket", "3 to 4 tickets", "0 to 6 days". */
function binText(props: HistogramProps, bin: Bin) {
  const single = bin.whole && bin.to - bin.from === 1
  return withUnit(props, binLabel(props, bin), single ? bin.from : 2)
}

// A whole-number bin holds each integer across a unit of width, so a value
// sits in the middle of its unit.
const positionOf = (value: number, whole: boolean) =>
  whole ? value + 0.5 : value

function xTicks(bins: readonly Bin[], frame: PlotFrame) {
  const first = bins[0]
  if (!first) return []
  const centred = first.whole && first.to - first.from === 1
  const positions = centred
    ? bins.map((b) => b.from + 0.5)
    : [...bins.map((b) => b.from), bins.at(-1)!.to]
  const step = Math.ceil(positions.length / MAX_X_TICKS[frame.band])
  return positions.filter((_, i) => i % step === 0)
}

type BinDatum = Bin & PlotDatum & { zero: 0 }

function binData(props: HistogramProps): BinDatum[] {
  const series = fieldLabel(props.x)
  return binValues(histogramValues(props), props).map((b) => ({
    ...b,
    x: b.from,
    y: b.count,
    series,
    zero: 0
  }))
}

function medianMarks(
  props: HistogramProps,
  paint: ChartPaint,
  frame: PlotFrame,
  top: number
) {
  const values = histogramValues(props)
  const median = props.median ? medianOf(values) : null
  if (median === null) return []
  const x = positionOf(median, values.every(Number.isInteger))
  return [
    decorative(
      ruleX([{ x }], {
        id: 'median',
        x: 'x',
        stroke: paint.median,
        strokeWidth: 1.25,
        strokeDasharray: '3 3'
      })
    ),
    decorative(
      text(
        [
          {
            x,
            y: top,
            label: `Median ${labelFormat(props.format, median)}`
          }
        ],
        {
          id: 'label-median',
          x: 'x',
          y: 'y',
          text: 'label',
          dx: 4,
          dy: 4,
          anchor: 'start',
          fill: paint.value,
          fontSize: frame.fontSize,
          fontWeight: 600
        }
      )
    )
  ]
}

function build(props: HistogramProps, paint: ChartPaint, frame: PlotFrame) {
  const bins = binData(props)
  const xDomain: [number, number] = [bins[0]?.from ?? 0, bins.at(-1)?.to ?? 1]
  const centred = bins[0]?.whole && bins[0].to - bins[0].from === 1
  const xFormat = axisFormat(props.format, xDomain[1])
  const yDomain =
    frame.yDomain ??
    valueDomain(
      bins.map((b) => b.count),
      { zero: true, format: 'number' }
    )
  return defineChart({
    marks: [
      rect(bins, {
        id: seriesMarkId(1),
        x1: 'from',
        x2: 'to',
        y1: 'zero',
        y2: 'count',
        fill: paint.categorical[0]!,
        inset: 1
      }),
      ...medianMarks(props, paint, frame, yDomain[1])
    ],
    scales: {
      x: {
        scale: scaleLinear().domain(xDomain),
        axis: {
          line: false,
          ticks: {
            values: xTicks(bins, frame),
            size: 0,
            format: (value: number) => xFormat(centred ? value - 0.5 : value)
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
          ticks: {
            values: gridTicks(yDomain),
            size: 0,
            format: axisFormat('number', yDomain[1])
          },
          tickLabels: { fontSize: frame.fontSize }
        }
      }
    },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'nearest-x'
  })
}

const findBin = (props: HistogramProps, from: number) =>
  binValues(histogramValues(props), props).find((b) => b.from === from)

export const histogram: ChartDefinition<HistogramProps> = {
  kind: 'histogram',
  build,
  table: histogramTable,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const values = histogramValues(props)
    const median = medianOf(values)
    const [first, ...rest] = binValues(values, props)
    if (!first || median === null) return `Spread of ${unitOf(props)}`
    const top = rest.reduce((a, b) => (b.count > a.count ? b : a), first)
    return `The median is ${valueText(props, median)}, and the most common is ${binText(props, top)}`
  },
  emptyMessage: (props) =>
    histogramValues(props).length < 2 ? EMPTY : undefined,
  legend: () => [],
  describe(datum, props) {
    const bin = findBin(props, Number(datum.x))
    if (!bin) return String(datum.x)
    const total = histogramValues(props).length
    return `${binText(props, bin)}, ${formatValue(bin.count, 'number')} of ${formatValue(total, 'number')}`
  },
  tooltip(data, props, paint) {
    const bin = findBin(props, Number(data[0]?.x))
    if (!bin) return { title: '', rows: [] }
    return {
      title: binText(props, bin),
      rows: [
        {
          label: 'Count',
          value: formatValue(bin.count, 'number'),
          color: paint.categorical[0],
          shape: 'swatch' as const
        }
      ]
    }
  }
}
