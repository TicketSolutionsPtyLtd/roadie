import { areaY, dot, lineY, link, text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import { type LabelBox, labelBox } from './annotations'
import { plotHeight, textWidth } from './endLabels'
import { type PlotSpan, centredShift, spanPixel } from './frame'
import type { ChartPaint, PlotFrame } from './types'

export type RangePoint = { x: number; low: number | null; high: number | null }
export type LinePoint = { x: number; y: number | null }
export type ForecastPoint = LinePoint & { series: string }

// Reading aids are painted only, so focus, keyboard and tooltips stay on the data.
export function bandMarks(
  range: readonly RangePoint[],
  median: readonly LinePoint[],
  paint: ChartPaint
): ChartMark[] {
  return [
    decorative(
      areaY(range, {
        id: 'band',
        x: 'x',
        y1: 'low',
        y2: 'high',
        fill: paint.band,
        fillOpacity: paint.bandOpacity
      })
    ),
    ...(median.length
      ? [
          decorative(
            lineY(median, {
              id: 'median',
              x: 'x',
              y: 'y',
              stroke: paint.median,
              strokeWidth: 1.25,
              strokeDasharray: '3 3'
            })
          )
        ]
      : [])
  ]
}

export type ForecastStyle = { slot: number; color: string; strokeWidth: number }

/** The forecast continues its series, so it shares the series' `z`, colour and focus. */
export function forecastMarks(
  line: readonly ForecastPoint[],
  cone: readonly RangePoint[],
  { slot, color, strokeWidth }: ForecastStyle
): ChartMark[] {
  return [
    ...(cone.length
      ? [
          decorative(
            areaY(cone, {
              id: 'cone',
              x: 'x',
              y1: 'low',
              y2: 'high',
              fill: color,
              fillOpacity: 0.1
            })
          )
        ]
      : []),
    lineY(line, {
      id: `forecast-${slot}`,
      x: 'x',
      y: 'y',
      z: 'series',
      stroke: color,
      strokeWidth,
      strokeDasharray: '0.5 4',
      lineCap: 'round'
    })
  ]
}

export const TARGET_TICK_PIXELS = 14

/** A short tick at the plot's right edge, `length` x units long. */
export function targetMark(
  value: number,
  end: number,
  length: number,
  paint: ChartPaint
): ChartMark {
  const from = end - length
  return decorative(
    link([{ from, to: end, value }], {
      id: 'target',
      x1: 'from',
      x2: 'to',
      y1: 'value',
      y2: 'value',
      stroke: paint.value,
      strokeWidth: 2
    })
  )
}

export type TodayPoint = { x: number; y: number; label: string }

const TODAY_DOT_RADIUS = 3.5
const TODAY_LABEL_GAP = 0.5

// The text is centred on dy, so half its size clears the dot.
const todayLabelDy = (frame: PlotFrame) =>
  -(frame.fontSize / 2 + TODAY_DOT_RADIUS + TODAY_LABEL_GAP)

/**
 * The shift that keeps the today label inside the SVG, and the pixels it then
 * covers, so annotation labels can keep off it.
 */
export function placeTodayLabel(
  point: TodayPoint,
  span: PlotSpan,
  across: (x: number) => number,
  [low, high]: readonly [number, number],
  frame: PlotFrame
): { dx: number; box: LabelBox } {
  const x = spanPixel(span, across(point.x))
  const width = textWidth(point.label, frame)
  const dx = centredShift(x, width, frame.width)
  const down =
    high > low ? ((high - point.y) / (high - low)) * plotHeight(frame) : 0
  return {
    dx,
    box: labelBox(
      x + dx - width / 2,
      x + dx + width / 2,
      down + todayLabelDy(frame),
      frame
    )
  }
}

/**
 * A dot at today, labelled above and shifted `dx` px to stay inside the plot.
 * Pass a null label when an end label already carries it, so the two never
 * collide.
 */
export function todayMarks(
  point: TodayPoint,
  paint: ChartPaint,
  frame: PlotFrame,
  color = paint.highlight,
  label: { dx: number } | null = { dx: 0 }
): ChartMark[] {
  return [
    decorative(
      dot([point], {
        id: 'today',
        x: 'x',
        y: 'y',
        r: TODAY_DOT_RADIUS,
        fill: color,
        stroke: paint.surface,
        strokeWidth: 1.5
      })
    ),
    ...(label
      ? [
          decorative(
            text([point], {
              id: 'label-today',
              x: 'x',
              y: 'y',
              text: 'label',
              dx: label.dx,
              dy: todayLabelDy(frame),
              fill: paint.value,
              fontSize: frame.fontSize,
              fontWeight: 600
            })
          )
        ]
      : [])
  ]
}
