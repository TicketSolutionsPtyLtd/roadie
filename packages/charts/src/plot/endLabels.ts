import { text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'

import type { ChartPaint, PlotFrame } from './types'

export type EndLabel = {
  text: string
  y: number
  tone: 'value' | 'highlight' | 'label'
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

export function stackLabels(labels: readonly EndLabel[], minGap: number) {
  const sorted = [...labels].sort((a, b) => b.y - a.y)
  for (let i = 1; i < sorted.length; i++) {
    const above = sorted[i - 1]!
    const current = sorted[i]!
    if (above.y - current.y < minGap)
      sorted[i] = { ...current, y: above.y - minGap }
  }
  return sorted
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
  return text(
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
}
