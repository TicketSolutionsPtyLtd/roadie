import { areaY, dot, lineY, link, text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import type { ChartPaint, PlotFrame } from './types'

export type RangePoint = { x: number; low: number | null; high: number | null }
export type LinePoint = { x: number; y: number | null }
export type ForecastPoint = LinePoint & { series: string }

const TARGET_TICK_SHARE = 0.03

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

/** The forecast line is the series itself, so it shares the series' `z` and stays focusable. */
export function forecastMarks(
  line: readonly ForecastPoint[],
  cone: readonly RangePoint[],
  slot: number,
  paint: ChartPaint
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
              fill: paint.highlight,
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
      stroke: paint.highlight,
      strokeWidth: 2,
      strokeDasharray: '0.5 4',
      lineCap: 'round'
    })
  ]
}

export function targetMark(
  value: number,
  [start, end]: readonly [number, number],
  paint: ChartPaint
): ChartMark {
  const from = end - (end - start) * TARGET_TICK_SHARE
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
  frame: PlotFrame
): ChartMark[] {
  return [
    decorative(
      dot([point], {
        id: 'today',
        x: 'x',
        y: 'y',
        r: 3.5,
        fill: paint.highlight,
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
