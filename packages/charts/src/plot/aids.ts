import { areaY, dot, lineY, link, text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

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

export function todayMarks(
  point: LinePoint & { label: string },
  paint: ChartPaint,
  frame: PlotFrame,
  color = paint.highlight
): ChartMark[] {
  return [
    decorative(
      dot([point], {
        id: 'today',
        x: 'x',
        y: 'y',
        r: 3.5,
        fill: color,
        stroke: paint.surface,
        strokeWidth: 1.5
      })
    ),
    decorative(
      text([point], {
        id: 'label-today',
        x: 'x',
        y: 'y',
        text: 'label',
        dy: -10,
        fill: paint.value,
        fontSize: frame.fontSize,
        fontWeight: 600
      })
    )
  ]
}
