import { cell, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'

import { fieldLabel } from '../plot/table'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import { fullValue } from '../plot/values'
import { describeValue } from '../plot/words'
import { type HeatCell, axisLabels, heatBuckets, heatCells } from './cells'
import { heatmapTable } from './table'
import type { HeatmapProps } from './types'

const EMPTY = 'Nothing to show yet'

const rangeFor = (props: HeatmapProps, paint: ChartPaint) =>
  props.scale === 'diverging' ? paint.diverging : paint.heat

const bandAxis = (domain: readonly string[], frame: PlotFrame) => ({
  scale: scaleBand<string>().domain(domain),
  axis: {
    line: false,
    ticks: { size: 0 },
    tickLabels: { fontSize: frame.fontSize }
  }
})

function build(props: HeatmapProps, paint: ChartPaint, frame: PlotFrame) {
  const cells = heatCells(props).map((c) => ({
    ...c,
    x: c.column,
    y: c.value,
    series: c.row
  }))
  return defineChart({
    marks: [
      cell(cells, {
        id: 'cells',
        x: 'column',
        y: 'row',
        // Each row is a series, so up and down move between rows.
        z: 'row',
        color: 'bucket',
        inset: 1,
        radius: 2,
        states: [
          {
            when: { focus: 'primary' },
            style: { stroke: paint.value, strokeWidth: 2 }
          }
        ]
      })
    ],
    scales: {
      x: bandAxis(axisLabels(props, props.columns), frame),
      y: bandAxis(axisLabels(props, props.rows), frame)
    },
    color: {
      domain: heatBuckets(props.scale ?? 'sequential'),
      range: [...rangeFor(props, paint)]
    },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'nearest',
    // The engine's ring is a dot; a focused cell outlines itself instead.
    focusRing: false
  })
}

const peakOf = (cells: readonly HeatCell[]) =>
  cells.reduce<HeatCell | undefined>(
    (peak, c) => (peak && peak.value >= c.value ? peak : c),
    undefined
  )

export const heatmap: ChartDefinition<HeatmapProps> = {
  kind: 'heatmap',
  build,
  table: heatmapTable,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const cells = heatCells(props)
    const peak = peakOf(cells)
    const value = fieldLabel(props.value)
    if (!peak)
      return `${value} by ${fieldLabel(props.rows).toLowerCase()} and ${fieldLabel(props.columns).toLowerCase()}`
    const shown = (cell: HeatCell) =>
      `${cell.row} at ${cell.column}, with ${fullValue(props, cell.value)}`
    if (props.scale !== 'diverging') return `${value} peak on ${shown(peak)}`
    const low = cells.reduce((a, b) => (b.value < a.value ? b : a))
    return (
      [
        ...(peak.value > 0 ? [`Furthest ahead is ${shown(peak)}`] : []),
        ...(low.value < 0 ? [`Furthest behind is ${shown(low)}`] : [])
      ].join('. ') || `${value} is even everywhere`
    )
  },
  emptyMessage: (props) => (heatCells(props).length === 0 ? EMPTY : undefined),
  legend(props, paint) {
    const range = rangeFor(props, paint)
    return props.scale === 'diverging'
      ? [
          { label: 'Behind', shape: 'swatch', color: range[8] },
          { label: 'Ahead', shape: 'swatch', color: range[0] }
        ]
      : [
          { label: 'Fewer', shape: 'swatch', color: range[1] },
          { label: 'More', shape: 'swatch', color: range[8] }
        ]
  },
  describe(datum, props) {
    return `${datum.series}, ${datum.x}, ${describeValue(datum.y, props, fieldLabel(props.value).toLowerCase())}`
  },
  tooltip(data, props, paint) {
    const datum = data[0]
    if (!datum) return { title: '', rows: [] }
    const step = heatCells(props).find((c) => c.index === datum.index)?.step
    return {
      title: `${datum.series}, ${datum.x}`,
      rows: [
        {
          label: fieldLabel(props.value),
          value: datum.y === null ? 'No data' : fullValue(props, datum.y),
          color: step === undefined ? undefined : rangeFor(props, paint)[step],
          shape: 'swatch'
        }
      ]
    }
  }
}
