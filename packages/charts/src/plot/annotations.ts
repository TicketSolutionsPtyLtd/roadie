import { ruleX, text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import type { PlotAnnotation } from '@oztix/roadie-core/dashboard'

import { textWidth } from './endLabels'
import { type PlotSpan, besideAnchor, spanPixel } from './frame'
import { parseX } from './time'
import type { ChartPaint, PlotFrame } from './types'
import { finiteOrNull } from './values'

/** `across` is how far along the plot the annotation sits, from 0 to 1. */
export type PlacedAnnotation = {
  x: number | string
  label: string
  y: number
  across: number
}

const LABEL_GAP = 4
const LABEL_DY = 4

/** The pixels a label covers along the x axis, from the SVG's left edge. */
export type LabelSpan = { left: number; right: number }

const clash = (a: LabelSpan, b: LabelSpan | null) =>
  b !== null && a.left < b.right && b.left < a.right

/** Places annotations on a continuous x axis, dropping any outside `domain`. */
export function annotationsOnAxis(
  annotations: readonly PlotAnnotation[] = [],
  [start, end]: readonly [number, number],
  isTime: boolean,
  y: number
): PlacedAnnotation[] {
  return annotations.flatMap(({ at, label }) => {
    const x = isTime ? parseX(at) : finiteOrNull(at)
    if (x === null || x < start || x > end) return []
    const across = end > start ? (x - start) / (end - start) : 0
    return [{ x, label, y, across }]
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
  const fromCentre = (bar: { x: number }) => Math.abs(bar.x + span / 2 - time)
  return (
    holding ??
    timed.reduce((best, bar) =>
      fromCentre(bar) < fromCentre(best) ? bar : best
    )
  )
}

/**
 * Places annotations on bars. Time bars each cover `span` ms, and an
 * annotation snaps to the bar that holds its wall time, or across a gap to the
 * bar whose centre is nearest. Other bars match by name, with a null `span`.
 * Anything else is dropped.
 */
export function annotationsOnBars(
  annotations: readonly PlotAnnotation[] = [],
  bars: readonly BarSlot[],
  span: number | null,
  y: number
): PlacedAnnotation[] {
  return annotations.flatMap(({ at, label }) => {
    const bar = barFor(at, bars, span)
    if (!bar) return []
    const across = (bars.indexOf(bar) + 0.5) / bars.length
    return [{ x: bar.key, label, y, across }]
  })
}

/**
 * Each label reads right of its rule, or left when it would leave `span`. A
 * label that would cross `avoid`, such as the today label, reads on the other
 * side, or drops a line when both sides cross it.
 */
export function annotationMarks(
  annotations: readonly PlacedAnnotation[],
  paint: ChartPaint,
  frame: PlotFrame,
  span: PlotSpan,
  avoid: LabelSpan | null = null
): ChartMark[] {
  if (annotations.length === 0) return []
  const placed = annotations.map((annotation) => {
    const x = spanPixel(span, annotation.across)
    const width = textWidth(annotation.label, frame)
    const covers = (side: 'start' | 'end'): LabelSpan =>
      side === 'start'
        ? { left: x + LABEL_GAP, right: x + LABEL_GAP + width }
        : { left: x - LABEL_GAP - width, right: x - LABEL_GAP }
    const preferred = besideAnchor(x, LABEL_GAP, width, span.width)
    const other = preferred === 'start' ? 'end' : 'start'
    const otherFits =
      other === 'end'
        ? covers('end').left >= 0
        : covers('start').right <= span.width
    const anchor =
      clash(covers(preferred), avoid) &&
      otherFits &&
      !clash(covers(other), avoid)
        ? other
        : preferred
    const dropped = clash(covers(anchor), avoid)
    return {
      ...annotation,
      anchor,
      dx: anchor === 'start' ? LABEL_GAP : -LABEL_GAP,
      // A glyph box runs taller than the font size, so a line down is two of them.
      dy: dropped ? LABEL_DY + 2 * frame.fontSize : LABEL_DY
    }
  })
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
      text(placed, {
        id: 'label-annotations',
        x: 'x',
        y: 'y',
        text: 'label',
        dx: (d) => d.dx,
        dy: (d) => d.dy,
        anchor: (d) => d.anchor,
        fill: paint.label,
        fontSize: frame.fontSize,
        fontWeight: 600
      })
    )
  ]
}
