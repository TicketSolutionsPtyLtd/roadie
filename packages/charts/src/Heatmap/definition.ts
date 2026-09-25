import { cell, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { fieldLabel } from '../plot/table'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import { describeValue } from '../plot/words'
import { type HeatCell, firstSeen, heatBuckets, heatCells } from './cells'
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
      x: bandAxis(firstSeen(cells.map((c) => c.column)), frame),
      y: bandAxis(firstSeen(cells.map((c) => c.row)), frame)
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
    const peak = peakOf(heatCells(props))
    const value = fieldLabel(props.value)
    if (!peak)
      return `${value} by ${fieldLabel(props.rows).toLowerCase()} and ${fieldLabel(props.columns).toLowerCase()}`
    return `${value} peak on ${peak.row} at ${peak.column}, with ${formatValue(peak.value, props.format ?? 'number')}`
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
    return `${datum.series}, ${datum.x}, ${describeValue(datum.y, props.format, fieldLabel(props.value).toLowerCase())}`
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
          value:
            datum.y === null
              ? 'No data'
              : formatValue(datum.y, props.format ?? 'number'),
          color: step === undefined ? undefined : rangeFor(props, paint)[step],
          shape: 'swatch'
        }
      ]
    }
  }
}
