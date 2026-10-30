import {
  type ConfiguredScaleLike,
  barY,
  defineChart,
  lineY,
  text
} from '@tanstack/charts'
import { group } from '@tanstack/charts/group'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { annotationMarks, annotationsOnBars } from '../plot/annotations'
import { plotSpan, textRoom } from '../plot/endLabels'
import { fieldLabel } from '../plot/table'
import {
  formatTimeTick,
  formatTimeTitle,
  isTimeField,
  parseX,
  spokenX
} from '../plot/time'
import type {
  ChartDefinition,
  ChartPaint,
  PlotFrame,
  WidthBand
} from '../plot/types'
import {
  axisFormat,
  fullFormat,
  gridTicks,
  labelFormat,
  valueDomain
} from '../plot/values'
import { describeValue, lowerFirst } from '../plot/words'
import {
  type Bar,
  barYExtent,
  comparisonLabel,
  hasBars,
  hasComparison,
  toBars
} from './bars'
import { barChartTable } from './table'
import type { BarChartProps } from './types'

const EMPTY = 'Nothing to show for this period yet'
const HOUR = 3_600_000
const DAY = 86_400_000
const INTERVAL_MS = { hour: HOUR, day: DAY, week: 7 * DAY }
const TICK_TARGET: Record<WidthBand, number> = {
  narrow: 3,
  default: 6,
  wide: 10
}
const LABEL_PADDING = 12
const LINE_WIDTH = 2
const BAR_PADDING = 0.2
const BAR_INSET = 1
const BAR_MAX = 48
const PAIR_PADDING = 0.3
const COMPARED = 'comparison'
const CURRENT = 'current'
const SHARE_DOMAIN: readonly [number, number] = [0, 1]

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

type LineDatum = Pick<Bar, 'line'> & { x: string }

const lineMark = (
  data: readonly LineDatum[],
  id: string,
  stroke: string,
  strokeWidth: number
) =>
  decorative(
    lineY(data, {
      id,
      x: 'x',
      y: 'line',
      yScale: 'line',
      stroke,
      strokeWidth,
      lineCap: 'round',
      lineJoin: 'round'
    })
  )

type PairKey = typeof COMPARED | typeof CURRENT

/**
 * Splits a slot into the comparison then the current bar, each capped like a
 * lone bar and centred as a pair, so wide slots keep the two together. The
 * gap between them is the bars' own inset.
 */
function pairScale(): ConfiguredScaleLike<PairKey> {
  let width = 0
  let middle = 0
  const scale = (key: PairKey) => (key === COMPARED ? middle - width : middle)
  const pair: ConfiguredScaleLike<PairKey> = Object.assign(scale, {
    bandwidth: () => width,
    copy: pairScale,
    domain: () => [COMPARED, CURRENT] as const,
    // The engine sets the slot's range in place and ignores the return.
    range(next: Iterable<number>) {
      const [start = 0, end = 0] = next
      const span = Math.abs(end - start)
      width = Math.max(Math.min(span / 2, BAR_MAX + BAR_INSET * 2), 0)
      middle = span / 2
      return pair
    }
  })
  return pair
}

const pairLayout = group({ scale: pairScale() })

// A share reads against the whole, so percent lines always run to 100%.
const lineDomain = (
  line: NonNullable<BarChartProps['line']>,
  bars: readonly Bar[]
) =>
  line.format === 'percent'
    ? SHARE_DOMAIN
    : valueDomain(
        bars.map((b) => b.line),
        { zero: true }
      )

function build(props: BarChartProps, paint: ChartPaint, frame: PlotFrame) {
  const series = fieldLabel(props.y)
  const bars = toBars(props)
  const data = bars.map((bar) => ({ ...bar, x: bar.key, series }))
  const keys = bars.map((b) => b.key)
  const yDomain = frame.yDomain ?? barYExtent(props)
  const format = axisFormat(props.format, yDomain[1])
  const line = props.line
  const end = lineLabel(props, bars)
  const rightMargin = end ? textRoom([end.text], frame, LABEL_PADDING) : 8
  const span = plotSpan(frame, gridTicks(yDomain).map(format), rightMargin)
  const paired = hasComparison(bars)

  return defineChart({
    marks: [
      // Drawn first so a bar hides the rule instead of being struck through.
      ...annotationMarks(
        annotationsOnBars(
          props.annotations,
          bars,
          isTimeField(props.data, props.x)
            ? INTERVAL_MS[props.interval ?? 'day']
            : null,
          yDomain[1]
        ),
        paint,
        frame,
        span
      ),
      // Comparison first, so each pair reads then → now.
      ...(paired
        ? [
            decorative(
              barY(data, {
                id: 'comparison',
                x: 'x',
                y: 'comparison',
                z: () => COMPARED,
                layout: pairLayout,
                fill: paint.context,
                inset: BAR_INSET,
                maxThickness: BAR_MAX,
                radius: { end: 2 }
              })
            )
          ]
        : []),
      barY(data, {
        id: 'series-1',
        x: 'x',
        y: 'y',
        ...(paired && { z: () => CURRENT, layout: pairLayout }),
        fill: paint.categorical[0]!,
        inset: BAR_INSET,
        maxThickness: BAR_MAX,
        radius: { end: 2 }
      }),
      // The bars carry both measures in words and the tooltip, so the line
      // adds no keyboard stops of its own.
      ...(line
        ? [
            // A surface-coloured casing keeps the line legible over pale bars.
            lineMark(data, 'line-underlay', paint.surface, LINE_WIDTH + 3),
            lineMark(data, 'line', paint.value, LINE_WIDTH)
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
        scale: scaleBand<string>()
          .domain(keys)
          .padding(paired ? PAIR_PADDING : BAR_PADDING),
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
          scale: scaleLinear().domain(lineDomain(line, bars)),
          channel: 'y' as const,
          side: 'right' as const,
          axis: false as const
        }
      })
    },
    margin: { right: rightMargin },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'group-x'
  })
}

export const barChart: ChartDefinition<BarChartProps> = {
  kind: 'bar',
  build,
  table: barChartTable,
  yExtent: barYExtent,
  rangeAxis(props) {
    if (!isTimeField(props.data, props.x)) return null
    return {
      values: toBars(props).map((b) => b.key),
      msOf: parseX,
      options: {
        hasTime: isHourly(props),
        bucketDays: props.interval === 'week' ? 7 : 1
      },
      bands: true
    }
  },
  summary(props) {
    if (props.takeaway) return props.takeaway
    const noun = fieldLabel(props.y)
    const peak = toBars(props).reduce<Bar | undefined>(
      (best, b) =>
        b.y !== null && (best?.y == null || b.y > best.y) ? b : best,
      undefined
    )
    if (peak?.y == null) return `${noun} by ${props.interval ?? 'day'}`
    const value = formatValue(peak.y, fullFormat(props.format))
    const ms = parseX(peak.key)
    const when =
      ms === null
        ? `at ${peak.key}`
        : isHourly(props)
          ? `on ${formatTimeTitle(ms, true)}`
          : props.interval === 'week'
            ? `in the week of ${formatTimeTitle(ms, false)}`
            : `on ${formatTimeTitle(ms, false)}`
    return `${noun} peaked at ${value} ${when}`
  },
  emptyMessage: (props) => (hasBars(toBars(props)) ? undefined : EMPTY),
  legend(props, paint) {
    const comparison = comparisonLabel(props)
    if (!comparison || !hasComparison(toBars(props))) return []
    return [
      {
        label: fieldLabel(props.y),
        shape: 'swatch' as const,
        color: paint.categorical[0]!,
        slot: 1
      },
      {
        label: comparison,
        shape: 'swatch' as const,
        color: paint.context,
        slot: 2
      }
    ]
  },
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
        `${lowerFirst(line.label)} ${
          bar.line === null
            ? 'no data'
            : formatValue(bar.line, fullFormat(line.format))
        }`
      )
    const comparison = comparisonLabel(props)
    const compared = barAt(props, key)?.comparison
    if (comparison && compared != null)
      parts.push(
        `${lowerFirst(comparison)} ${formatValue(compared, fullFormat(props.format))}`
      )
    return parts.join(', ')
  },
  tooltip(data, props, paint) {
    const key = data[0] ? String(data[0].x) : ''
    const ms = parseX(key)
    const bar = barAt(props, key)
    const line = props.line
    const comparison = comparisonLabel(props)
    const shown = (value: number | null | undefined, format = props.format) =>
      value == null ? 'No data' : formatValue(value, fullFormat(format))
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
          : []),
        ...(comparison && bar?.comparison != null
          ? [
              {
                label: comparison,
                value: shown(bar.comparison),
                color: paint.context,
                shape: 'swatch' as const
              }
            ]
          : [])
      ]
    }
  }
}
