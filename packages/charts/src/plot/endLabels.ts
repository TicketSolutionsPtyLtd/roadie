import { text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import type { ChartPaint, PlotFrame } from './types'

export type EndLabel = {
  text: string
  y: number
  tone: 'value' | 'highlight' | 'label'
  /** Keeps its value, such as a target beside its tick, while others move. */
  pinned?: boolean
}

const AXIS_ROOM = 34
const MAX_END_LABELS = 4
const CHAR_WIDTH = 0.62
const LABEL_PADDING = 12

export function textRoom(
  texts: readonly string[],
  frame: PlotFrame,
  padding: number
) {
  const longest = Math.max(0, ...texts.map((t) => t.length))
  return Math.ceil(longest * frame.fontSize * CHAR_WIDTH) + padding
}

type Stack = { labels: EndLabel[]; top: number }

const bottomOf = (stack: Stack, gap: number) =>
  stack.top - (stack.labels.length - 1) * gap

function stackTop(
  labels: readonly EndLabel[],
  gap: number,
  [low, high]: readonly [number, number]
) {
  const pinned = labels.findIndex((label) => label.pinned)
  if (pinned >= 0) return labels[pinned]!.y + pinned * gap
  const centred =
    labels.reduce((sum, label, i) => sum + label.y + i * gap, 0) / labels.length
  return Math.max(Math.min(centred, high), low + (labels.length - 1) * gap)
}

/** Spreads colliding labels evenly around where they want to be, inside `range`. */
export function stackLabels(
  labels: readonly EndLabel[],
  minGap: number,
  range: readonly [number, number] = [-Infinity, Infinity]
) {
  const stacks: Stack[] = []
  for (const label of [...labels].sort((a, b) => b.y - a.y)) {
    let stack: Stack = { labels: [label], top: label.y }
    for (
      let above = stacks.at(-1);
      above && bottomOf(above, minGap) - stack.top < minGap - 1e-9;
      above = stacks.at(-1)
    ) {
      stacks.pop()
      const merged = [...above.labels, ...stack.labels]
      stack = { labels: merged, top: stackTop(merged, minGap, range) }
    }
    stacks.push(stack)
  }
  return stacks.flatMap((stack) =>
    stack.labels.map((label, i) => ({ ...label, y: stack.top - i * minGap }))
  )
}

export function labelGap(
  frame: PlotFrame,
  [low, high]: readonly [number, number]
) {
  return ((frame.fontSize + 3) / (frame.height - AXIS_ROOM)) * (high - low)
}

export function endLabelsFit(count: number, frame: PlotFrame) {
  return frame.band !== 'narrow' && count <= MAX_END_LABELS
}

export const endLabelRoom = (labels: readonly EndLabel[], frame: PlotFrame) =>
  textRoom(
    labels.map((label) => label.text),
    frame,
    LABEL_PADDING
  )

export function endLabelMark(
  labels: readonly EndLabel[],
  x: number | string,
  paint: ChartPaint,
  frame: PlotFrame
): ChartMark {
  const tone = {
    value: paint.value,
    highlight: paint.highlight,
    label: paint.label
  }
  return decorative(
    text(
      labels.map((label) => ({ ...label, x })),
      {
        id: 'label-end',
        x: 'x',
        y: 'y',
        text: 'text',
        dx: 8,
        anchor: 'start',
        fontSize: frame.fontSize,
        fontWeight: 600,
        fill: (label) => tone[label.tone]
      }
    )
  )
}
