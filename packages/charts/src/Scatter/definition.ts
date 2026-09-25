import {
  type ChartMark,
  defineChart,
  dot,
  ruleX,
  ruleY,
  text
} from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { type ValueFormat, formatValue } from '@oztix/roadie-core/dataviz'

import { asList, emphasisColor } from '../plot/series'
import { fieldLabel } from '../plot/table'
import type {
  ChartDefinition,
  ChartPaint,
  PlotDatum,
  PlotFrame
} from '../plot/types'
import { axisFormat, gridTicks, isCountAxis } from '../plot/values'
import {
  MIN_POINTS,
  type ScatterPoint,
  quadrantOf,
  scatterPoints
} from './points'
import { scatterTable } from './table'
import type { ScatterProps, ScatterQuadrants } from './types'

const EMPTY = 'Not enough data yet to compare'
// One z group for every dot, so the arrow keys walk across both marks.
const POINTS_GROUP = 'points'
const LABEL_OFFSET = 4

function extent(
  values: readonly number[],
  reference: number | undefined,
  format: ValueFormat | undefined
): [number, number] {
  const all = reference === undefined ? values : [...values, reference]
  if (all.length === 0) return [0, 1]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const pad = (max - min) * 0.08 || Math.abs(max) * 0.1 || 1
  const scale = scaleLinear()
    .domain([min - pad, max + pad])
    .nice(4)
  const [niceLow, niceHigh] = scale.domain()
  const low = min >= 0 ? Math.max(0, niceLow) : niceLow
  const [first = 0, second = 1] = scale.ticks(4)
  // A count axis steps its top up once so the middle gridline lands whole.
  const high =
    isCountAxis(all, format) && !Number.isInteger((low + niceHigh) / 2)
      ? niceHigh + (second - first)
      : niceHigh
  return [low, format === 'percent' && max <= 1 ? Math.min(1, high) : high]
}

type Placed = ScatterPoint & PlotDatum & { labelAnchor: 'start' | 'end' }

function quadrantMarks(
  quadrants: ScatterQuadrants,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
  paint: ChartPaint,
  frame: PlotFrame
): ChartMark[] {
  const { labels } = quadrants
  const inset = frame.fontSize / 2 + 2
  const [left, right] = xDomain
  const [bottom, top] = yDomain
  const corners = [
    { x: left, y: top, text: labels.topLeft, anchor: 'start', dy: inset },
    { x: right, y: top, text: labels.topRight, anchor: 'end', dy: inset },
    {
      x: left,
      y: bottom,
      text: labels.bottomLeft,
      anchor: 'start',
      dy: -inset
    },
    { x: right, y: bottom, text: labels.bottomRight, anchor: 'end', dy: -inset }
  ] as const
  const line = { stroke: paint.axis, strokeWidth: 1, strokeDasharray: '2 3' }
  return [
    decorative(
      ruleX([{ x: quadrants.x }], { id: 'quadrant-x', x: 'x', ...line })
    ),
    decorative(
      ruleY([{ y: quadrants.y }], { id: 'quadrant-y', y: 'y', ...line })
    ),
    decorative(
      text(corners, {
        id: 'label-quadrants',
        x: 'x',
        y: 'y',
        text: 'text',
        anchor: (d) => d.anchor,
        dy: (d) => d.dy,
        fill: paint.label,
        fontSize: frame.fontSize
      })
    )
  ]
}

const colourOf = (
  point: ScatterPoint,
  props: ScatterProps,
  paint: ChartPaint
) => emphasisColor(point.name, props.highlight, paint) ?? paint.categorical[0]!

function pointMarks(
  points: readonly Placed[],
  props: ScatterProps,
  paint: ChartPaint,
  frame: PlotFrame
): ChartMark[] {
  const dots = {
    x: 'xValue',
    y: 'yValue',
    z: () => POINTS_GROUP,
    key: 'index',
    r: 'r',
    stroke: paint.surface,
    strokeWidth: 1
  } as const
  const markOf = (id: string, group: readonly Placed[]) =>
    dot(group, { ...dots, id, fill: colourOf(group[0]!, props, paint) })
  if (points.length === 0) return []
  if (asList(props.highlight).length === 0) return [markOf('series-1', points)]
  const context = points.filter((p) => !p.highlighted)
  const highlighted = points.filter((p) => p.highlighted)
  return [
    ...(context.length ? [markOf('series-context', context)] : []),
    ...(highlighted.length
      ? [
          markOf('series-highlight', highlighted),
          decorative(
            text(highlighted, {
              id: 'label-points',
              x: 'xValue',
              y: 'yValue',
              text: 'name',
              key: 'index',
              anchor: (d) => d.labelAnchor,
              dx: (d) =>
                (d.r + LABEL_OFFSET) * (d.labelAnchor === 'start' ? 1 : -1),
              fill: paint.value,
              fontSize: frame.fontSize,
              fontWeight: 600
            })
          )
        ]
      : [])
  ]
}

function build(props: ScatterProps, paint: ChartPaint, frame: PlotFrame) {
  const measured = scatterPoints(props)
  const xDomain = extent(
    measured.map((p) => p.xValue),
    props.quadrants?.x,
    props.xFormat
  )
  const yDomain =
    frame.yDomain ??
    extent(
      measured.map((p) => p.yValue),
      props.quadrants?.y,
      props.format
    )
  const middle = (xDomain[0] + xDomain[1]) / 2
  // Labels point inward so they stay on the plot.
  const points: Placed[] = measured.map((p) => ({
    ...p,
    x: p.xValue,
    y: p.yValue,
    series: p.name,
    labelAnchor: p.xValue > middle ? 'end' : 'start'
  }))

  return defineChart({
    marks: [
      ...(props.quadrants
        ? quadrantMarks(props.quadrants, xDomain, yDomain, paint, frame)
        : []),
      ...pointMarks(points, props, paint, frame)
    ],
    scales: {
      x: {
        scale: scaleLinear().domain(xDomain),
        axis: {
          line: false,
          ticks: {
            values: gridTicks(xDomain),
            size: 0,
            format: axisFormat(props.xFormat, xDomain[1])
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
            format: axisFormat(props.format, yDomain[1])
          },
          tickLabels: { fontSize: frame.fontSize }
        }
      }
    },
    margin: { right: 8 },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'nearest'
  })
}

const noun = (props: ScatterProps) =>
  props.label ? fieldLabel(props.label).toLowerCase() : 'point'

const pointAt = (props: ScatterProps, index: number) =>
  scatterPoints(props).find((p) => p.index === index)

const measure = (field: string, value: number, format?: ValueFormat) =>
  `${fieldLabel(field).toLowerCase()} ${formatValue(value, format ?? 'number')}`

export const scatter: ChartDefinition<ScatterProps> = {
  kind: 'scatter',
  build,
  table: scatterTable,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const points = scatterPoints(props)
    const { quadrants } = props
    if (quadrants) {
      const count = points.filter(
        (p) => quadrantOf(p, quadrants) === 'topRight'
      ).length
      return `${count} of ${points.length} ${noun(props)}s are ${quadrants.labels.topRight.toLowerCase()}`
    }
    return `${fieldLabel(props.y)} against ${fieldLabel(props.x).toLowerCase()} for ${points.length} ${noun(props)}s`
  },
  emptyMessage: (props) =>
    scatterPoints(props).length < MIN_POINTS ? EMPTY : undefined,
  legend: () => [],
  describe(datum, props) {
    const point = pointAt(props, datum.index)
    if (!point) return datum.series
    return [
      point.name,
      measure(props.x, point.xValue, props.xFormat),
      measure(props.y, point.yValue, props.format),
      ...(props.quadrants
        ? [
            props.quadrants.labels[
              quadrantOf(point, props.quadrants)
            ].toLowerCase()
          ]
        : [])
    ].join(', ')
  },
  tooltip(data, props, paint) {
    const first = data[0]
    const point = first && pointAt(props, first.index)
    if (!point) return { title: '', rows: [] }
    return {
      title: point.name,
      rows: [
        {
          label: fieldLabel(props.x),
          value: formatValue(point.xValue, props.xFormat ?? 'number')
        },
        {
          label: fieldLabel(props.y),
          value: formatValue(point.yValue, props.format ?? 'number'),
          color: colourOf(point, props, paint),
          shape: 'swatch' as const
        },
        ...(props.size && point.size !== null
          ? [
              {
                label: fieldLabel(props.size),
                value: formatValue(point.size, 'number')
              }
            ]
          : [])
      ]
    }
  }
}
