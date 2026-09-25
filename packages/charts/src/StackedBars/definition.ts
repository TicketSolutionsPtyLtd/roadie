import { barX, barY, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { formatValue } from '@oztix/roadie-core/dataviz'

import { seriesMarkId, seriesStyles } from '../plot/series'
import { fieldLabel } from '../plot/table'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'
import { axisFormat, fullFormat, gridTicks, valueDomain } from '../plot/values'
import { describeValue } from '../plot/words'
import { type Segment, segmentNames, stackSegments } from './stack'
import { stackedBarsTable } from './table'
import type { StackedBarsProps } from './types'

const EMPTY = 'Nothing to show yet'
const BAR_THICKNESS = 36

const styles = (props: StackedBarsProps, paint: ChartPaint) =>
  seriesStyles(
    segmentNames(props),
    { highlight: props.highlight, palette: props.palette },
    paint
  )

const percent = (value: number) => formatValue(value, 'percent')

function build(props: StackedBarsProps, paint: ChartPaint, frame: PlotFrame) {
  const segments = stackSegments(props).map((s) => ({
    ...s,
    x: s.category,
    y: s.value
  }))
  const categories = [...new Set(segments.map((s) => s.category))]
  const domain: readonly [number, number] =
    props.mode === 'share'
      ? [0, 1]
      : (frame.yDomain ??
        valueDomain(
          segments.map((s) => s.end),
          { zero: true }
        ))
  const format =
    props.mode === 'share' ? percent : axisFormat(props.format, domain[1])
  const layers = styles(props, paint).map((style) => ({
    own: segments.filter((s) => s.series === style.name),
    options: {
      id: seriesMarkId(style.slot),
      z: 'series',
      fill: style.color,
      // The surface stroke is the gap between segments.
      stroke: paint.surface,
      strokeWidth: 1,
      maxThickness: BAR_THICKNESS
    } as const
  }))
  const valueAxis = {
    scale: scaleLinear().domain(domain),
    grid: { stroke: paint.grid, strokeOpacity: 1 }
  }
  const valueTicks = {
    line: false,
    ticks: { values: gridTicks(domain), size: 0, format }
  }
  const categoryAxis = {
    scale: scaleBand<string>().domain(categories).padding(0.3),
    axis: {
      line: false,
      ticks: { size: 0 },
      tickLabels: { fontSize: frame.fontSize }
    }
  }
  const theme = {
    muted: paint.label,
    foreground: paint.value,
    grid: paint.grid
  }

  if (props.orientation === 'vertical')
    return defineChart({
      marks: layers.map(({ own, options }) =>
        barY(own, { ...options, x: 'category', y1: 'start', y2: 'end' })
      ),
      scales: {
        x: categoryAxis,
        y: {
          ...valueAxis,
          axis: { ...valueTicks, tickLabels: { fontSize: frame.fontSize } }
        }
      },
      theme,
      focus: 'group-x'
    })

  return defineChart({
    marks: layers.map(({ own, options }) =>
      barX(own, { ...options, y: 'category', x1: 'start', x2: 'end' })
    ),
    scales: {
      x: {
        ...valueAxis,
        axis: {
          ...valueTicks,
          tickLabels: {
            fontSize: frame.fontSize,
            // Keeps the end ticks inside the plot.
            anchor: ({ value }) =>
              value === domain[0]
                ? 'start'
                : value === domain[1]
                  ? 'end'
                  : 'middle'
          }
        }
      },
      y: categoryAxis
    },
    theme,
    focus: 'group-y'
  })
}

function largestIn(segments: readonly Segment[], category: string) {
  return segments
    .filter((s) => s.category === category)
    .reduce((a, b) => (b.value > a.value ? b : a)).series
}

function largestOverall(segments: readonly Segment[]) {
  const totals = new Map<string, number>()
  for (const s of segments)
    totals.set(s.series, (totals.get(s.series) ?? 0) + s.value)
  return [...totals].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
}

export const stackedBars: ChartDefinition<StackedBarsProps> = {
  kind: 'stacked-bars',
  categoryAxis: (props) => (props.orientation === 'vertical' ? 'x' : 'y'),
  build,
  table: stackedBarsTable,
  summary(props) {
    if (props.takeaway) return props.takeaway
    const segments = stackSegments(props)
    const noun = fieldLabel(props.y).toLowerCase()
    if (segments.length === 0)
      return `${fieldLabel(props.y)} by ${fieldLabel(props.series).toLowerCase()}`
    const categories = [...new Set(segments.map((s) => s.category))]
    const leaders = new Set(categories.map((c) => largestIn(segments, c)))
    return leaders.size === 1
      ? `${[...leaders][0]} is the largest part of ${noun} in every ${fieldLabel(props.x).toLowerCase()}`
      : `${largestOverall(segments)} is the largest part of ${noun} overall`
  },
  emptyMessage: (props) =>
    stackSegments(props).length === 0 ? EMPTY : undefined,
  legend: (props, paint) =>
    styles(props, paint).map((s) => ({
      label: s.name,
      shape: 'swatch' as const,
      color: s.color
    })),
  describe(datum, props) {
    const segment = stackSegments(props).find(
      (s) => s.category === datum.x && s.series === datum.series
    )
    const noun = fieldLabel(props.y).toLowerCase()
    const base = `${datum.x}, ${datum.series}, ${describeValue(segment?.value ?? null, fullFormat(props.format), noun)}`
    return props.mode === 'share' && segment
      ? `${base}, ${percent(segment.share)} of the bar`
      : base
  },
  tooltip(data, props, paint) {
    const category = String(data[0]?.x ?? '')
    const colours = new Map(styles(props, paint).map((s) => [s.name, s.color]))
    const format = fullFormat(props.format)
    return {
      title: category,
      rows: stackSegments(props)
        .filter((s) => s.category === category)
        .map((s) => ({
          label: s.series,
          value:
            props.mode === 'share'
              ? `${percent(s.share)} (${formatValue(s.value, format)})`
              : formatValue(s.value, format),
          color: colours.get(s.series),
          shape: 'swatch' as const
        }))
    }
  }
}
