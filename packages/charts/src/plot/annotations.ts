import { ruleX, text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import type { PlotAnnotation } from '@oztix/roadie-core/dashboard'

import { parseX } from './time'
import type { ChartPaint, PlotFrame } from './types'
import { finiteOrNull } from './values'

export type PlacedAnnotation = { x: number | string; label: string; y: number }

/** Places annotations on a continuous x axis, dropping any outside `domain`. */
export function annotationsOnAxis(
  annotations: readonly PlotAnnotation[] = [],
  [start, end]: readonly [number, number],
  isTime: boolean,
  y: number
): PlacedAnnotation[] {
  return annotations.flatMap(({ at, label }) => {
    const x = isTime ? parseX(at) : finiteOrNull(at)
    return x === null || x < start || x > end ? [] : [{ x, label, y }]
  })
}

type BarSlot = { key: string; x: number | string }

function barFor(
  at: PlotAnnotation['at'],
  bars: readonly BarSlot[],
  span: number | null
) {
  const named = bars.find((bar) => bar.key === String(at))
  if (named || span === null) return named
  const time = parseX(at)
  const timed = bars.filter(
    (bar): bar is { key: string; x: number } => typeof bar.x === 'number'
  )
  const first = timed[0]
  const last = timed.at(-1)
  if (time === null || !first || !last) return undefined
  if (time < first.x || time >= last.x + span) return undefined
  const holding = timed.find((bar) => bar.x <= time && time < bar.x + span)
  return (
    holding ??
    timed.reduce((best, bar) =>
      Math.abs(bar.x - time) < Math.abs(best.x - time) ? bar : best
    )
  )
}

/**
 * Places annotations on bars. Time bars each cover `span` ms, and an
 * annotation snaps to the bar that holds its wall time, or the nearest across a
 * gap. Other bars match by name, with a null `span`. Anything else is dropped.
 */
export function annotationsOnBars(
  annotations: readonly PlotAnnotation[] = [],
  bars: readonly BarSlot[],
  span: number | null,
  y: number
): PlacedAnnotation[] {
  return annotations.flatMap(({ at, label }) => {
    const bar = barFor(at, bars, span)
    return bar ? [{ x: bar.key, label, y }] : []
  })
}

export function annotationMarks(
  annotations: readonly PlacedAnnotation[],
  paint: ChartPaint,
  frame: PlotFrame
): ChartMark[] {
  if (annotations.length === 0) return []
  return [
    decorative(
      ruleX(annotations, {
        id: 'annotation-rules',
        x: 'x',
        stroke: paint.axis,
        strokeWidth: 1,
        strokeDasharray: '2 3'
      })
    ),
    decorative(
      text(annotations, {
        id: 'label-annotations',
        x: 'x',
        y: 'y',
        text: 'label',
        dx: 4,
        dy: 4,
        anchor: 'start',
        fill: paint.label,
        fontSize: frame.fontSize,
        fontWeight: 600
      })
    )
  ]
}
