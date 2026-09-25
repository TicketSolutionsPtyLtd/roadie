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
import { axisFormat, gridTicks, labelFormat, valueDomain } from '../plot/values'
import { type Bin, binValues, histogramValues, medianOf } from './bin'
import { histogramTable, rangeLabel } from './table'
import type { HistogramProps } from './types'

const EMPTY = 'Not enough data yet to show a spread'

const unitOf = (props: HistogramProps) => fieldLabel(props.x).toLowerCase()

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
  const median = props.median ? medianOf(histogramValues(props)) : null
  if (median === null) return []
  return [
    decorative(
      ruleX([{ x: median }], {
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
            x: median,
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
  const yDomain =
    frame.yDomain ??
    valueDomain(
      bins.map((b) => b.count),
      { zero: true }
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
            count: 5,
            size: 0,
            format: axisFormat(props.format, xDomain[1])
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
    return `The median ${unitOf(props)} is ${formatValue(median, props.format ?? 'number')}, and the most common range is ${rangeLabel(props, top.from, top.to)}`
  },
  emptyMessage: (props) =>
    histogramValues(props).length < 2 ? EMPTY : undefined,
  legend: () => [],
  describe(datum, props) {
    const bin = findBin(props, Number(datum.x))
    if (!bin) return String(datum.x)
    const total = histogramValues(props).length
    return `${rangeLabel(props, bin.from, bin.to)} ${unitOf(props)}, ${formatValue(bin.count, 'number')} of ${formatValue(total, 'number')}`
  },
  tooltip(data, props, paint) {
    const bin = findBin(props, Number(data[0]?.x))
    if (!bin) return { title: '', rows: [] }
    return {
      title: `${rangeLabel(props, bin.from, bin.to)} ${unitOf(props)}`,
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
