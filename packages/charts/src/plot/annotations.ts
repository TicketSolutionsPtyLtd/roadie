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
const LINES = [0, 1, 2]

/**
 * The pixels a label covers, across from the SVG's left edge and down from
 * the plot's top.
 */
export type LabelBox = {
  left: number
  right: number
  top: number
  bottom: number
}

/** A glyph box runs taller than the font size, so lines sit two sizes apart. */
export const labelBox = (
  left: number,
  right: number,
  middle: number,
  frame: PlotFrame
): LabelBox => ({
  left,
  right,
  top: middle - frame.fontSize * 0.75,
  bottom: middle + frame.fontSize * 0.75
})

const clash = (a: LabelBox, b: LabelBox | null) =>
  b !== null &&
  a.left < b.right &&
  b.left < a.right &&
  a.top < b.bottom &&
  b.top < a.bottom

declare const process: { env?: { NODE_ENV?: string } } | undefined

const warned = new Set<string>()

function warnDropped({ at, label }: PlotAnnotation) {
  if (typeof process === 'undefined' || process?.env?.NODE_ENV === 'production')
    return
  const message = `Roadie chart: the annotation "${label}" at ${at} is outside the data, so it doesn't show`
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

/** Places annotations on a continuous x axis, dropping any outside `domain`. */
export function annotationsOnAxis(
  annotations: readonly PlotAnnotation[] = [],
  [start, end]: readonly [number, number],
  isTime: boolean,
  y: number
): PlacedAnnotation[] {
  return annotations.flatMap(({ at, label }) => {
    const x = isTime ? parseX(at) : finiteOrNull(at)
    if (x === null || x < start || x > end) {
      warnDropped({ at, label })
      return []
    }
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
 * side if it fits there, or drops a line at a time until clear.
 */
export function annotationMarks(
  annotations: readonly PlacedAnnotation[],
  paint: ChartPaint,
  frame: PlotFrame,
  span: PlotSpan,
  avoid: LabelBox | null = null
): ChartMark[] {
  if (annotations.length === 0) return []
  const placed = annotations.map((annotation) => {
    const x = spanPixel(span, annotation.across)
    const width = textWidth(annotation.label, frame)
    const preferred = besideAnchor(x, LABEL_GAP, width, span.width)
    // Left of the rule, a label must clear the y tick labels too.
    const flips = preferred === 'start' && x - LABEL_GAP - width >= span.left
    const sides = flips ? (['start', 'end'] as const) : [preferred]
    const dyOf = (line: number) => LABEL_DY + line * 2 * frame.fontSize
    const covers = (side: 'start' | 'end', line: number) =>
      side === 'start'
        ? labelBox(x + LABEL_GAP, x + LABEL_GAP + width, dyOf(line), frame)
        : labelBox(x - LABEL_GAP - width, x - LABEL_GAP, dyOf(line), frame)
    const spots = LINES.flatMap((line) => sides.map((side) => ({ side, line })))
    const { side, line } = spots.find(
      (spot) => !clash(covers(spot.side, spot.line), avoid)
    ) ?? { side: preferred, line: 0 }
    return {
      ...annotation,
      anchor: side,
      dx: side === 'start' ? LABEL_GAP : -LABEL_GAP,
      dy: dyOf(line)
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
