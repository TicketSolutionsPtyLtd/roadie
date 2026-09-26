import { barX, defineChart, text, tickX } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { textRoom } from '../plot/endLabels'
import { asList, emphasisColor, seriesMarkId } from '../plot/series'
import { fieldLabel } from '../plot/table'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import { fullFormat, labelFormat, valueDomain } from '../plot/values'
import { describeValue } from '../plot/words'
import { type Ranked, rank, rankable } from './rank'
import { rankedBarsTable } from './table'
import type { RankedBarsProps } from './types'

const EMPTY = 'Nothing to rank yet'
const MAX_NAME_ROOM = 180
const NAME_PADDING = 8
const VALUE_PADDING = 12
const VALUE_GAP = 6
const STORY_SLOT = 1
const CONTEXT_SLOT = 2
const OTHER_MARK = 'series-other'

function fillFor(props: RankedBarsProps, paint: ChartPaint) {
  return (bar: Pick<Ranked, 'name' | 'isOther'>) =>
    bar.isOther
      ? paint.other
      : (emphasisColor(bar.name, props.highlight, paint) ??
        paint.categorical[0]!)
}

// One mark per role, so forced colours give each role its own texture.
function markIdOf(
  props: RankedBarsProps,
  bar: Pick<Ranked, 'name' | 'isOther'>
) {
  if (bar.isOther) return OTHER_MARK
  const highlighted = asList(props.highlight)
  return highlighted.length && !highlighted.includes(bar.name)
    ? seriesMarkId(CONTEXT_SLOT)
    : seriesMarkId(STORY_SLOT)
}

function byMark<T extends Pick<Ranked, 'name' | 'isOther'>>(
  props: RankedBarsProps,
  bars: readonly T[]
) {
  const marks = new Map<string, T[]>()
  for (const bar of bars) {
    const id = markIdOf(props, bar)
    marks.set(id, [...(marks.get(id) ?? []), bar])
  }
  return [...marks.entries()]
}

const full = (props: RankedBarsProps, value: number) =>
  formatValue(value, fullFormat(props.format))

const barLabel = (props: RankedBarsProps, bar: Ranked) =>
  props.share
    ? formatValue(bar.share, 'percent')
    : labelFormat(props.format, bar.value)

function bars(props: RankedBarsProps) {
  const ranked = rank(props)
  const total = ranked.reduce((sum, bar) => sum + bar.value, 0) || 1
  const scale = (value: number) => (props.share ? value / total : value)
  return ranked.map((bar) => {
    const y = scale(bar.value)
    const tick = bar.reference === null ? null : scale(bar.reference)
    return {
      ...bar,
      x: bar.name,
      y,
      tick,
      labelAt: Math.max(y, tick ?? y),
      series: fieldLabel(props.y),
      label: barLabel(props, bar)
    }
  })
}

function build(props: RankedBarsProps, paint: ChartPaint, frame: PlotFrame) {
  const shown = bars(props)
  const domain = valueDomain(
    shown.flatMap((b) => [b.y, b.tick]),
    { zero: true, nice: false }
  )
  const nameRoom = Math.min(
    MAX_NAME_ROOM,
    textRoom(
      shown.map((b) => b.name),
      frame,
      NAME_PADDING
    )
  )
  const valueRoom = textRoom(
    shown.map((b) => b.label),
    frame,
    VALUE_PADDING
  )
  const ticked = shown.filter((b) => b.tick !== null)
  return defineChart({
    marks: [
      ...byMark(props, shown).map(([id, group]) =>
        barX(group, {
          id,
          x: 'y',
          y: 'name',
          z: 'series',
          fill: fillFor(props, paint),
          inset: 2,
          maxThickness: 28
        })
      ),
      ...(props.reference && ticked.length
        ? [
            decorative(
              tickX(ticked, {
                id: 'reference',
                x: 'tick',
                y: 'name',
                key: 'name',
                stroke: paint.value,
                strokeWidth: 2,
                span: 0.8
              })
            )
          ]
        : []),
      decorative(
        text(shown, {
          id: 'label-values',
          x: 'labelAt',
          y: 'name',
          key: 'name',
          text: 'label',
          dx: VALUE_GAP,
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
          .domain(shown.map((b) => b.name))
          .padding(0.25),
        axis: {
          line: false,
          ticks: { size: 0 },
          tickLabels: { fontSize: frame.fontSize }
        }
      }
    },
    margin: { left: nameRoom, right: valueRoom },
    theme: { muted: paint.label, foreground: paint.value, grid: paint.grid },
    focus: 'nearest-y'
  })
}

const barNamed = (props: RankedBarsProps, name: unknown) =>
  rank(props).find((bar) => bar.name === name)

export const rankedBars: ChartDefinition<RankedBarsProps> = {
  kind: 'ranked-bars',
  build,
  table: rankedBarsTable,
  categoryAxis: () => 'y',
  summary(props) {
    if (props.takeaway) return props.takeaway
    // Named rows only: Other is a remainder, never a rival.
    const [first, second] = rankable(props)
    const measure = fieldLabel(props.y)
    if (!first) return `${measure} by ${fieldLabel(props.x).toLowerCase()}`
    const lead = `${first.name} leads with ${describeValue(first.value, props.format, measure.toLowerCase())}`
    return second
      ? `${lead}, ahead of ${second.name} with ${full(props, second.value)}`
      : lead
  },
  emptyMessage: (props) => (rank(props).length === 0 ? EMPTY : undefined),
  legend: (props, paint) =>
    props.reference
      ? [{ label: props.reference.label, shape: 'line', color: paint.value }]
      : [],
  describe(datum, props) {
    const bar = barNamed(props, datum.x)
    const noun = fieldLabel(props.y).toLowerCase()
    const parts = [
      String(datum.x),
      describeValue(bar?.value ?? null, props.format, noun),
      ...(props.share && bar
        ? [`${formatValue(bar.share, 'percent')} of the total`]
        : []),
      ...(props.reference && bar?.reference != null
        ? [
            `${props.reference.label.toLowerCase()} ${full(props, bar.reference)}`
          ]
        : [])
    ]
    return parts.join(', ')
  },
  tooltip(data, props, paint) {
    const bar = barNamed(props, data[0]?.x)
    if (!bar) return { title: '', rows: [] }
    return {
      title: bar.name,
      rows: [
        {
          label: fieldLabel(props.y),
          value: full(props, bar.value),
          color: fillFor(props, paint)(bar),
          shape: 'swatch'
        },
        ...(props.share
          ? [{ label: 'Share', value: formatValue(bar.share, 'percent') }]
          : []),
        ...(props.reference && bar.reference !== null
          ? [
              {
                label: props.reference.label,
                value: full(props, bar.reference),
                color: paint.value,
                shape: 'line' as const
              }
            ]
          : [])
      ]
    }
  }
}
