import { defineChart, link, text } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import {
  type PieDatum,
  focusGroupAngle,
  pie,
  polar,
  radialArc
} from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { textWidth } from '../plot/endLabels'
import { type SeriesStyle, seriesMarkId, seriesStyles } from '../plot/series'
import { fieldLabel } from '../plot/table'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import { fullValue, labelFormat } from '../plot/values'
import { describeValue } from '../plot/words'
import { type DonutPart, donutParts } from './parts'
import { donutChartTable } from './table'
import type { DonutChartProps } from './types'

const EMPTY = 'Nothing to show yet'
const HOLE = 0.62
const LEADER = 8
const ELBOW = 8
const LABEL_GAP = 4
const MIN_RADIUS = 24
const LINE_HEIGHT = 1.3
const CENTRE_PADDING = 8
const TOTAL_SCALES = [2, 1.5, 1]

type Slice = DonutPart & {
  x: string
  y: number
  series: string
  index: number
  style: SeriesStyle
}

const percentText = (percent: number) => `${percent}%`

const centreLabel = (props: DonutChartProps) =>
  props.total ?? fieldLabel(props.y)

function slicesOf(props: DonutChartProps, paint: ChartPaint): Slice[] {
  const parts = donutParts(props)
  const styles = seriesStyles(
    parts.map((part) => part.name),
    { highlight: props.highlight, palette: 'categorical' },
    paint
  )
  return parts.map((part, index) => ({
    ...part,
    x: part.name,
    y: part.value,
    series: fieldLabel(props.y),
    index,
    style: styles[index]!
  }))
}

/** The ring's outer radius, leaving room around it for the percent labels. */
function ringRadius(frame: PlotFrame) {
  const across = textWidth('100%', frame) + LEADER + ELBOW + LABEL_GAP
  const down = frame.fontSize + LEADER
  return Math.max(
    MIN_RADIUS,
    Math.min(frame.width / 2 - across, frame.height / 2 - down)
  )
}

type Label = {
  name: string
  text: string
  side: 1 | -1
  edgeX: number
  edgeY: number
  kneeX: number
  y: number
}

// Labels on each side stack top to bottom with a line's room between them,
// so neighbouring small slices never print over each other, and stay inside
// a plot shorter than the ring's reach.
function spread(
  labels: Label[],
  lineHeight: number,
  [top, bottom]: readonly [number, number]
) {
  labels.sort((a, b) => a.y - b.y)
  for (const [i, label] of labels.entries()) {
    const above = labels[i - 1]
    label.y = Math.max(label.y, above ? above.y + lineHeight : top)
  }
  for (let i = labels.length - 1; i >= 0; i--) {
    const below = labels[i + 1]
    labels[i]!.y = Math.min(labels[i]!.y, below ? below.y - lineHeight : bottom)
  }
}

/** Percent labels outside the ring, in pixels from its centre, y down. */
function placeLabels(
  arcs: readonly PieDatum<Slice>[],
  radius: number,
  frame: PlotFrame
): Label[] {
  const reach = radius + LEADER
  const labels = arcs
    .filter((arc) => arc.labelled)
    .map((arc): Label => {
      const sin = Math.sin(arc.angle)
      const cos = Math.cos(arc.angle)
      return {
        name: arc.name,
        text: percentText(arc.percent),
        side: sin >= 0 ? 1 : -1,
        edgeX: (radius + 1) * sin,
        edgeY: -(radius + 1) * cos,
        kneeX: reach * sin,
        y: -reach * cos
      }
    })
  const lineHeight = frame.fontSize * LINE_HEIGHT
  const half = frame.height / 2
  // Glyphs sit a little above a middle baseline, so the top keeps more room.
  const bounds = [lineHeight / 2 - half, half - frame.fontSize / 2] as const
  for (const side of [1, -1])
    spread(
      labels.filter((label) => label.side === side),
      lineHeight,
      bounds
    )
  // A label pushed up or down keeps its knee outside the ring.
  for (const label of labels) {
    const clear = Math.sqrt(Math.max(0, reach ** 2 - label.y ** 2))
    label.kneeX = label.side * Math.max(Math.abs(label.kneeX), clear)
  }
  return labels
}

function centreMarks(
  props: DonutChartProps,
  total: number,
  radius: number,
  frame: PlotFrame,
  paint: ChartPaint
) {
  const room = 2 * radius * HOLE - CENTRE_PADDING
  const value = labelFormat(props, total)
  const valueFrame = TOTAL_SCALES.map((scale) => ({
    ...frame,
    fontSize: frame.fontSize * scale
  })).find((size) => textWidth(value, size) <= room)
  if (!valueFrame) return []
  const name = centreLabel(props)
  const named =
    textWidth(name, frame) <= room &&
    valueFrame.fontSize + frame.fontSize * LINE_HEIGHT <= room
  const valueY = named ? -frame.fontSize * 0.6 : 0
  return [
    decorative(
      text([{ x: 0, y: valueY, text: value }], {
        id: 'label-total',
        x: 'x',
        y: 'y',
        text: 'text',
        anchor: 'middle',
        fill: paint.value,
        fontSize: valueFrame.fontSize,
        fontWeight: 600
      })
    ),
    ...(named
      ? [
          decorative(
            text([{ x: 0, y: valueY + valueFrame.fontSize, text: name }], {
              id: 'label-total-name',
              x: 'x',
              y: 'y',
              text: 'text',
              anchor: 'middle',
              fill: paint.label,
              fontSize: frame.fontSize
            })
          )
        ]
      : [])
  ]
}

function build(props: DonutChartProps, paint: ChartPaint, frame: PlotFrame) {
  const slices = slicesOf(props, paint)
  const arcs = pie(slices, { value: 'value' })
  const radius = ringRadius(frame)
  const labels = placeLabels(arcs, radius, frame)
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const marks = new Map<string, PieDatum<Slice>[]>()
  for (const arc of arcs) {
    const id = seriesMarkId(arc.style.slot)
    marks.set(id, [...(marks.get(id) ?? []), arc])
  }
  const halfWidth = frame.width / 2
  const halfHeight = frame.height / 2
  return defineChart({
    marks: [
      polar({
        inset: Math.max(0, Math.min(halfWidth, halfHeight) - radius),
        marks: [...marks].map(([id, group]) =>
          radialArc(group, {
            id,
            key: 'name',
            innerRadius: ({ radius: outer }) => outer * HOLE,
            fill: (arc) => arc.style.color,
            // The surface between slices keeps neighbours apart.
            stroke: paint.surface,
            strokeWidth: 1
          })
        ),
        scales: { angle: null, radius: null }
      }),
      decorative(
        link(
          labels.flatMap((label) => [
            {
              key: `${label.name}-leader`,
              x1: label.edgeX,
              y1: label.edgeY,
              x2: label.kneeX,
              y2: label.y
            },
            {
              key: `${label.name}-elbow`,
              x1: label.kneeX,
              y1: label.y,
              x2: label.kneeX + label.side * ELBOW,
              y2: label.y
            }
          ]),
          {
            id: 'leaders',
            key: 'key',
            x1: 'x1',
            y1: 'y1',
            x2: 'x2',
            y2: 'y2',
            stroke: paint.axis,
            strokeWidth: 1
          }
        )
      ),
      decorative(
        text(
          labels.map((label) => ({
            ...label,
            at: label.kneeX + label.side * (ELBOW + LABEL_GAP),
            anchor: label.side > 0 ? ('start' as const) : ('end' as const)
          })),
          {
            id: 'label-values',
            key: 'name',
            x: 'at',
            y: 'y',
            text: 'text',
            anchor: (label) => label.anchor,
            fill: paint.value,
            fontSize: frame.fontSize,
            fontWeight: 600
          }
        )
      ),
      ...centreMarks(props, total, radius, frame, paint)
    ],
    scales: {
      x: {
        scale: scaleLinear().domain([-halfWidth, halfWidth]),
        axis: false
      },
      // Reversed, so y counts down the screen like the label geometry.
      y: {
        scale: scaleLinear().domain([halfHeight, -halfHeight]),
        axis: false
      }
    },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    guides: false,
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: focusGroupAngle
  })
}

const partNamed = (props: DonutChartProps, name: unknown) =>
  donutParts(props).find((part) => part.name === name)

const noun = (props: DonutChartProps) => fieldLabel(props.y).toLowerCase()

export const donutChart: ChartDefinition<DonutChartProps> = {
  kind: 'donut',
  build,
  table: donutChartTable,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const parts = donutParts(props)
    const [first] = parts
    if (!first)
      return `${fieldLabel(props.y)} by ${fieldLabel(props.x).toLowerCase()}`
    const total = parts.reduce((sum, part) => sum + part.value, 0)
    return `${first.name} is ${percentText(first.percent)} of ${describeValue(total, props, noun(props))}`
  },
  emptyMessage: (props) => (donutParts(props).length === 0 ? EMPTY : undefined),
  legend: (props, paint) =>
    slicesOf(props, paint).map((slice) => ({
      label: `${slice.name} ${fullValue(props, slice.value)} (${percentText(slice.percent)})`,
      shape: 'swatch',
      color: slice.style.color,
      slot: slice.style.slot
    })),
  describe(datum, props) {
    const part = partNamed(props, datum.x)
    if (!part) return String(datum.x)
    return `${part.name}, ${describeValue(part.value, props, noun(props))}, ${percentText(part.percent)}`
  },
  tooltip(data, props, paint) {
    const slice = slicesOf(props, paint).find((s) => s.name === data[0]?.x)
    if (!slice) return { title: '', rows: [] }
    return {
      title: slice.name,
      rows: [
        {
          label: fieldLabel(props.y),
          value: fullValue(props, slice.value),
          color: slice.style.color,
          shape: 'swatch'
        },
        { label: 'Share', value: percentText(slice.percent) }
      ]
    }
  }
}
