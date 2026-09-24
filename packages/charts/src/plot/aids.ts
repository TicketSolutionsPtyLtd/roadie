import { areaY, dot, lineY, link, text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'

import type { ChartPaint, PlotFrame } from './types'

export type RangePoint = { x: number; low: number | null; high: number | null }
export type LinePoint = { x: number; y: number | null }

const TARGET_TICK_SHARE = 0.03

export function bandMarks(
  range: readonly RangePoint[],
  median: readonly LinePoint[],
  paint: ChartPaint
): ChartMark[] {
  return [
    areaY(range, {
      id: 'band',
      x: 'x',
      y1: 'low',
      y2: 'high',
      fill: paint.band,
      fillOpacity: paint.bandOpacity
    }),
    ...(median.length
      ? [
          lineY(median, {
            id: 'median',
            x: 'x',
            y: 'y',
            stroke: paint.median,
            strokeWidth: 1.25,
            strokeDasharray: '3 3'
          })
        ]
      : [])
  ]
}

export function forecastMarks(
  line: readonly LinePoint[],
  cone: readonly RangePoint[],
  slot: number,
  paint: ChartPaint
): ChartMark[] {
  return [
    ...(cone.length
      ? [
          areaY(cone, {
            id: 'cone',
            x: 'x',
            y1: 'low',
            y2: 'high',
            fill: paint.highlight,
            fillOpacity: 0.1
          })
        ]
      : []),
    lineY(line, {
      id: `forecast-${slot}`,
      x: 'x',
      y: 'y',
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
  return link([{ from, to: end, value }], {
    id: 'target',
    x1: 'from',
    x2: 'to',
    y1: 'value',
    y2: 'value',
    stroke: paint.value,
    strokeWidth: 2
  })
}

export function todayMarks(
  point: LinePoint & { label: string },
  paint: ChartPaint,
  frame: PlotFrame
): ChartMark[] {
  return [
    dot([point], {
      id: 'today',
      x: 'x',
      y: 'y',
      r: 3.5,
      fill: paint.highlight,
      stroke: paint.surface,
      strokeWidth: 1.5
    }),
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
  ]
}
