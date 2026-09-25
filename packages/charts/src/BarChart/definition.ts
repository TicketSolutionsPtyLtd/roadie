import { barY, defineChart, lineY, text } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { annotationMarks } from '../plot/annotations'
import { textRoom } from '../plot/endLabels'
import { fieldLabel } from '../plot/table'
import { formatTimeTick, formatTimeTitle, parseX, spokenX } from '../plot/time'
import type {
  ChartDefinition,
  ChartPaint,
  PlotFrame,
  WidthBand
} from '../plot/types'
import { axisFormat, gridTicks, labelFormat, valueDomain } from '../plot/values'
import { describeValue } from '../plot/words'
import { type Bar, barYExtent, hasBars, toBars } from './bars'
import { barChartTable } from './table'
import type { BarChartProps } from './types'

const EMPTY = 'Nothing to show for this period yet'
const DAY = 86_400_000
const TICK_TARGET: Record<WidthBand, number> = {
  narrow: 3,
  default: 6,
  wide: 10
}
const LABEL_PADDING = 12

const isHourly = (props: BarChartProps) => props.interval === 'hour'

function tickKeys(keys: readonly string[], band: WidthBand) {
  const step = Math.max(1, Math.ceil(keys.length / TICK_TARGET[band]))
  return keys.filter((_, i) => i % step === 0)
}

function tickLabel(props: BarChartProps, key: string) {
  const ms = parseX(key)
  if (ms === null) return key
  return formatTimeTick(ms, isHourly(props) ? DAY : 2 * DAY)
}

function title(props: BarChartProps, ms: number) {
  const when = formatTimeTitle(ms, isHourly(props))
  return props.interval === 'week' ? `Week of ${when}` : when
}

function spoken(props: BarChartProps, ms: number) {
  const when = spokenX(ms, isHourly(props))
  return props.interval === 'week' ? `Week of ${when}` : when
}

const barAt = (props: BarChartProps, key: string) =>
  toBars(props).find((b) => b.key === key)

function lineLabel(props: BarChartProps, bars: readonly Bar[]) {
  const line = props.line
  const last = bars.findLast((b) => b.line !== null)
  if (!line || last?.line == null) return null
  return {
    key: last.key,
    value: last.line,
    text: `${line.label} ${labelFormat(line.format, last.line)}`
  }
}

function build(props: BarChartProps, paint: ChartPaint, frame: PlotFrame) {
  const series = fieldLabel(props.y)
  const bars = toBars(props)
  const data = bars.map((bar) => ({ ...bar, x: bar.key, series }))
  const keys = bars.map((b) => b.key)
  const yDomain = frame.yDomain ?? barYExtent(props)
  const format = axisFormat(props.format, yDomain[1])
  const line = props.line
  const end = lineLabel(props, bars)

  return defineChart({
    marks: [
      // Drawn first so a bar hides the rule instead of being struck through.
      ...annotationMarks(
        (props.annotations ?? []).map((a) => ({
          x: String(a.at),
          label: a.label,
          y: yDomain[1]
        })),
        paint,
        frame
      ),
      barY(data, {
        id: 'series-1',
        x: 'x',
        y: 'y',
        fill: paint.categorical[0]!,
        inset: 1,
        maxThickness: 48,
        radius: { end: 2 }
      }),
      // The bars carry both measures in words and the tooltip, so the line
      // adds no keyboard stops of its own.
      ...(line
        ? [
            decorative(
              lineY(data, {
                id: 'line',
                x: 'x',
                y: 'line',
                yScale: 'line',
                stroke: paint.value,
                strokeWidth: 2,
                lineCap: 'round',
                lineJoin: 'round'
              })
            )
          ]
        : []),
      ...(end
        ? [
            decorative(
              text([end], {
                id: 'label-line',
                x: 'key',
                y: 'value',
                yScale: 'line',
                text: 'text',
                dx: 8,
                anchor: 'start',
                fill: paint.value,
                fontSize: frame.fontSize,
                fontWeight: 600
              })
            )
          ]
        : [])
    ],
    scales: {
      x: {
        scale: scaleBand<string>().domain(keys).padding(0.2),
        axis: {
          line: false,
          ticks: {
            values: tickKeys(keys, frame.band),
            size: 0,
            format: (key: string) => tickLabel(props, key)
          },
          tickLabels: { fontSize: frame.fontSize }
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
      },
      ...(line && {
        line: {
          scale: scaleLinear().domain(
            valueDomain(
              bars.map((b) => b.line),
              { zero: true }
            )
          ),
          channel: 'y' as const,
          side: 'right' as const,
          axis: false as const
        }
      })
    },
    margin: {
      right: end ? textRoom([end.text], frame, LABEL_PADDING) : 8
    },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'group-x'
  })
}

export const barChart: ChartDefinition<BarChartProps> = {
  kind: 'bar',
  build,
  table: barChartTable,
  yExtent: barYExtent,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const noun = fieldLabel(props.y)
    const peak = toBars(props).reduce<Bar | undefined>(
      (best, b) =>
        b.y !== null && (best?.y == null || b.y > best.y) ? b : best,
      undefined
    )
    if (peak?.y == null) return `${noun} by ${props.interval ?? 'day'}`
    const value = formatValue(peak.y, props.format ?? 'number')
    const ms = parseX(peak.key)
    const when =
      ms === null
        ? `at ${peak.key}`
        : isHourly(props)
          ? `at ${formatTimeTick(ms, DAY)} on ${formatTimeTitle(ms, false)}`
          : props.interval === 'week'
            ? `in the week of ${formatTimeTitle(ms, false)}`
            : `on ${formatTimeTitle(ms, false)}`
    return `${noun} peaked at ${value} ${when}`
  },
  emptyMessage: (props) => (hasBars(toBars(props)) ? undefined : EMPTY),
  legend: () => [],
  describe(datum, props) {
    const key = String(datum.x)
    const ms = parseX(key)
    const parts = [
      ms === null ? key : spoken(props, ms),
      describeValue(datum.y, props.format, fieldLabel(props.y).toLowerCase())
    ]
    const line = props.line
    const bar = line && barAt(props, key)
    if (line && bar)
      parts.push(
        `${line.label.toLowerCase()} ${
          bar.line === null
            ? 'no data'
            : formatValue(bar.line, line.format ?? 'number')
        }`
      )
    return parts.join(', ')
  },
  tooltip(data, props, paint) {
    const key = data[0] ? String(data[0].x) : ''
    const ms = parseX(key)
    const bar = barAt(props, key)
    const line = props.line
    const shown = (value: number | null | undefined, format = props.format) =>
      value == null ? 'No data' : formatValue(value, format ?? 'number')
    return {
      title: ms === null ? key : title(props, ms),
      rows: [
        {
          label: fieldLabel(props.y),
          value: shown(bar?.y),
          color: paint.categorical[0],
          shape: 'swatch' as const
        },
        ...(line
          ? [
              {
                label: line.label,
                value: shown(bar?.line, line.format),
                color: paint.value,
                shape: 'line' as const
              }
            ]
          : [])
      ]
    }
  }
}
