import { text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import { textRoom, textWidth } from './endLabels'
import { escapeXml } from './svg'
import type { ChartPaint, PlotFrame } from './types'

// Leaves the bars and their values at least 60% of the plot.
const ROOM_SHARE = 0.4
// About ten characters, so a narrow plot still shows whole short words.
const MIN_ROOM = 72
// About 32 characters at 12px: most names fit on one line before bars shrink.
const MAX_ROOM = 240
const LABEL_GAP = 8
const LINE_HEIGHT = 1.2
const LINE_GAP = 2
const MAX_LINES = 2
const ELLIPSIS = '…'
const MARK_ID = 'label-category'

/** The label column's width, gap included: the longest name, within a cap. */
export function categoryRoom(names: readonly string[], frame: PlotFrame) {
  const cap = Math.min(MAX_ROOM, Math.max(MIN_ROOM, frame.width * ROOM_SHARE))
  return Math.min(textRoom(names, frame, LABEL_GAP), cap)
}

/**
 * Two lines a row when each row's band has room for them, else one.
 * `reserved` is the plot height an axis takes from the bands.
 */
export function categoryLines(frame: PlotFrame, rows: number, reserved = 0) {
  const step = (frame.height - reserved) / Math.max(rows, 1)
  const twoLines = MAX_LINES * frame.fontSize * LINE_HEIGHT + LINE_GAP
  return step >= twoLines ? MAX_LINES : 1
}

// By code point, so a cut never splits an emoji into invalid text.
const prefix = (chars: readonly string[], end: number) =>
  chars.slice(0, end).join('')

function cut(text: string, width: number, frame: PlotFrame) {
  const chars = Array.from(text)
  let end = chars.length
  while (end > 1 && textWidth(prefix(chars, end) + ELLIPSIS, frame) > width)
    end--
  return prefix(chars, end).trimEnd() + ELLIPSIS
}

function longestPrefix(text: string, width: number, frame: PlotFrame) {
  const chars = Array.from(text)
  let end = 1
  while (
    end < chars.length &&
    textWidth(prefix(chars, end + 1), frame) <= width
  )
    end++
  return prefix(chars, end)
}

/** Wraps a name at words into `maxLines`, then ends it with an ellipsis. */
export function fitLines(
  label: string,
  width: number,
  frame: PlotFrame,
  maxLines: number
): string[] {
  const fits = (line: string) => textWidth(line, frame) <= width
  const lines: string[] = []
  let rest = label.trim().replace(/\s+/g, ' ')
  while (lines.length < maxLines - 1 && !fits(rest)) {
    const words = rest.split(/\s+/)
    let line = words[0]!
    for (const word of words.slice(1)) {
      if (!fits(`${line} ${word}`)) break
      line = `${line} ${word}`
    }
    if (!fits(line)) line = longestPrefix(line, width, frame)
    lines.push(line)
    rest = rest.slice(line.length).trimStart()
  }
  return [...lines, fits(rest) ? rest : cut(rest, width, frame)]
}

type CategoryLabelOptions = {
  /** The value at the plot's left edge. */
  x: number
  room: number
  lines: number
  frame: PlotFrame
  paint: ChartPaint
}

/**
 * Category names right-aligned in the left margin, each block centred on its
 * band. The key carries the full name for `withCategoryTitles`, and the line,
 * so a changed line is a new element rather than a stale one.
 */
export function categoryLabelMark(
  names: readonly string[],
  { x, room, lines, frame, paint }: CategoryLabelOptions
): ChartMark {
  const lineHeight = frame.fontSize * LINE_HEIGHT
  const data = names.flatMap((name) => {
    const fitted = fitLines(name, room - LABEL_GAP, frame, lines)
    const top = (-(fitted.length - 1) * lineHeight) / 2
    return fitted.map((line, i) => ({
      name,
      line,
      x,
      dy: top + i * lineHeight,
      key: JSON.stringify([name, i, line])
    }))
  })
  return decorative(
    text(data, {
      id: MARK_ID,
      x: 'x',
      y: 'name',
      key: 'key',
      text: 'line',
      dx: -LABEL_GAP,
      dy: (d) => d.dy,
      anchor: 'end',
      fill: paint.label,
      fontSize: frame.fontSize
    })
  )
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
}

const unescapeXml = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]!)

// The engine writes a key as `<mark>:<z>:string:<length>:<key>`, key last.
const CATEGORY_TEXT = new RegExp(
  `<text data-ts-key="${MARK_ID}:[^"]*?:string:\\d+:([^"]*)"[^>]*>`,
  'g'
)

/** Puts each category label's full name in a `<title>`, for a cut name. */
export function withCategoryTitles(svg: string) {
  return svg.replace(CATEGORY_TEXT, (tag, encoded: string) => {
    try {
      const [name] = JSON.parse(unescapeXml(encoded)) as [string]
      return `${tag}<title>${escapeXml(name)}</title>`
    } catch {
      return tag
    }
  })
}
