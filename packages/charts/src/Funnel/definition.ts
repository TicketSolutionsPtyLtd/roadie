import { barX, defineChart, text } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { textRoom } from '../plot/endLabels'
import { seriesMarkId, seriesStyles } from '../plot/series'
import type {
  ChartDefinition,
  ChartPaint,
  PlotDatum,
  PlotFrame
} from '../plot/types'
import { fullFormat, labelFormat, valueDomain } from '../plot/values'
import { type FunnelRow, biggestDrop, funnelRows } from './steps'
import { funnelTable } from './table'
import type { FunnelProps } from './types'

const EMPTY = 'No one has started this yet'
const SERIES = 'Steps'
const STEP_PADDING = 8
const VALUE_PADDING = 12

const pct = (v: number) => formatValue(v, 'percent')
const fullValue = (props: FunnelProps, v: number) =>
  formatValue(v, fullFormat(props.format))

// A phone has no room for the sentence; the tooltip and table keep it.
function endLabel(props: FunnelProps, row: FunnelRow, frame: PlotFrame) {
  if (row.ofPrevious === null) return labelFormat(props.format, row.value)
  if (frame.band === 'narrow') return pct(row.ofPrevious)
  return `${labelFormat(props.format, row.value)}, ${pct(row.ofPrevious)} of previous`
}

const stepStyle = (paint: ChartPaint) => seriesStyles([SERIES], {}, paint)[0]!

const rowFor = (props: FunnelProps, label: PlotDatum['x'] | undefined) =>
  funnelRows(props).find((r) => r.label === label)

function build(props: FunnelProps, paint: ChartPaint, frame: PlotFrame) {
  const style = stepStyle(paint)
  const rows = funnelRows(props).map((r) => ({
    ...r,
    x: r.label,
    y: r.value,
    series: SERIES,
    text: endLabel(props, r, frame)
  }))
  const domain = valueDomain(
    rows.map((r) => r.value),
    { zero: true }
  )
  const stepRoom = textRoom(
    rows.map((r) => r.label),
    frame,
    STEP_PADDING
  )
  const valueRoom = textRoom(
    rows.map((r) => r.text),
    frame,
    VALUE_PADDING
  )
  return defineChart({
    marks: [
      barX(rows, {
        id: seriesMarkId(style.slot),
        x: 'value',
        y: 'label',
        z: 'series',
        fill: style.color,
        inset: 2,
        maxThickness: 32
      }),
      decorative(
        text(rows, {
          id: 'label-values',
          x: 'value',
          y: 'label',
          text: 'text',
          dx: 6,
          anchor: 'start',
          fill: paint.value,
          fontSize: frame.fontSize,
          fontWeight: 600
        })
      )
    ],
    scales: {
      x: { scale: scaleLinear().domain(domain), axis: false },
      y: {
        scale: scaleBand<string>()
          .domain(rows.map((r) => r.label))
          .padding(0.25),
        axis: {
          line: false,
          ticks: { size: 0 },
          tickLabels: { fontSize: frame.fontSize }
        }
      }
    },
    margin: { left: stepRoom, right: valueRoom },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'nearest-y'
  })
}

export const funnel: ChartDefinition<FunnelProps> = {
  kind: 'funnel',
  build,
  table: funnelTable,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const rows = funnelRows(props)
    const first = rows[0]
    const last = rows.at(-1)
    if (!first || !last) return 'Funnel'
    const drop = biggestDrop(rows)
    // Step labels stay as written, since they can hold names.
    const reached = `${pct(last.ofFirst)} reached ${last.label} from ${first.label}`
    return drop
      ? `${reached}. The biggest drop is before ${drop.label}`
      : reached
  },
  emptyMessage: (props) =>
    (props.steps[0]?.value ?? 0) > 0 ? undefined : EMPTY,
  legend: () => [],
  categoryAxis: () => 'y',
  describe(datum, props) {
    const row = rowFor(props, datum.x)
    if (!row) return String(datum.x)
    const value = fullValue(props, row.value)
    return row.ofPrevious === null
      ? `${row.label}, ${value}`
      : `${row.label}, ${value}, ${pct(row.ofPrevious)} of the previous step, ${pct(row.ofFirst)} of the first`
  },
  tooltip(data, props, paint) {
    const row = rowFor(props, data[0]?.x)
    if (!row) return { title: '', rows: [] }
    return {
      title: row.label,
      rows: [
        {
          label: 'Count',
          value: fullValue(props, row.value),
          color: stepStyle(paint).color,
          shape: 'swatch' as const
        },
        ...(row.ofPrevious === null
          ? []
          : [
              { label: 'Of previous', value: pct(row.ofPrevious) },
              { label: 'Dropped', value: fullValue(props, row.dropped ?? 0) }
            ]),
        { label: 'Of first', value: pct(row.ofFirst) }
      ]
    }
  }
}
