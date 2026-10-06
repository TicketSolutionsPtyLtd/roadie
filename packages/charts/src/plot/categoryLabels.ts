import { text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import { escapeXml } from './svg'
import type { ChartPaint, PlotFrame } from './types'

// Leaves the bars and their values at least 60% of the plot.
const ROOM_SHARE = 0.4
// About ten characters, so a narrow plot still shows whole short words.
const MIN_ROOM = 72
// About 32 characters at 12px: most names fit on one line before bars shrink.
const MAX_ROOM = 240
const LABEL_GAP = 4
// Width estimates can run a pixel or two short of the painted glyphs.
export const EDGE_SLACK = 4
const PADDING = LABEL_GAP + EDGE_SLACK
const LINE_HEIGHT = 1.2
const LINE_GAP = 2
const MAX_LINES = 2
const ELLIPSIS = '…'
const MARK_ID = 'label-category'

const WIDE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\u3000-\u303F\u30A0-\u30FF\u3200-\u33FF\uFE30-\uFE4F\uFF00-\uFFEF]/u
// Glyphs near a full em in Intermission, which the averages undercount.
const BROAD = /[MW%@\u2014\u2026]/
const BROAD_LOWER = /[mw]/
const CAPITAL = /\p{Lu}/u
const EM = { wide: 1, broadLower: 0.9, capital: 0.72, other: 0.62 }

function emsOf(char: string) {
  if (WIDE.test(char) || BROAD.test(char)) return EM.wide
  if (BROAD_LOWER.test(char)) return EM.broadLower
  return CAPITAL.test(char) ? EM.capital : EM.other
}

/**
 * The shared 0.62em estimate, widened for capitals, broad glyphs and CJK, since a label
 * that runs wide leaves the card rather than overlapping a neighbour.
 */
export function labelWidth(text: string, frame: PlotFrame) {
  let ems = 0
  for (const char of text) ems += emsOf(char)
  return Math.ceil(ems * frame.fontSize)
}

export function categoryRoom(names: readonly string[], frame: PlotFrame) {
  const cap = Math.min(MAX_ROOM, Math.max(MIN_ROOM, frame.width * ROOM_SHARE))
  const longest = Math.max(0, ...names.map((name) => labelWidth(name, frame)))
  return Math.min(longest + PADDING, cap)
}

export type CategoryFit = {
  /** Lines a name may wrap to. */
  lines: number
  /** Draws every nth name, when rows are too tight for one line each. */
  every: number
}

/**
 * Two lines a row when each row's band has room for them, else one, else
 * every nth name. `reserved` is the plot height an axis takes from the bands.
 */
export function categoryFit(
  frame: PlotFrame,
  rows: number,
  reserved = 0
): CategoryFit {
  const step = (frame.height - reserved) / Math.max(rows, 1)
  const lineHeight = frame.fontSize * LINE_HEIGHT
  if (!(step > 0)) return { lines: 1, every: Math.max(rows, 1) }
  if (step >= MAX_LINES * lineHeight + LINE_GAP)
    return { lines: MAX_LINES, every: 1 }
  return { lines: 1, every: Math.max(1, Math.ceil(lineHeight / step)) }
}

/**
 * The names to draw when only every nth row has room: the kept names first,
 * such as a highlight, then the last and first rows, then every nth between,
 * never two closer than `every` rows.
 */
export function thinNames(
  names: readonly string[],
  every: number,
  keep: readonly string[]
) {
  if (every <= 1) return [...names]
  const last = names.length - 1
  const wanted = [
    ...names.flatMap((name, i) => (keep.includes(name) ? [i] : [])),
    last,
    ...names.map((_, i) => i)
  ]
  const chosen: number[] = []
  for (const i of wanted)
    if (chosen.every((at) => Math.abs(at - i) >= every)) chosen.push(i)
  return chosen.sort((a, b) => a - b).map((i) => names[i]!)
}

// By code point, so a cut never splits an emoji into invalid text.
const prefix = (chars: readonly string[], end: number) =>
  chars.slice(0, end).join('')

function cut(text: string, width: number, frame: PlotFrame) {
  const chars = Array.from(text)
  let end = chars.length
  while (end > 1 && labelWidth(prefix(chars, end) + ELLIPSIS, frame) > width)
    end--
  return prefix(chars, end).trimEnd() + ELLIPSIS
}

function longestPrefix(text: string, width: number, frame: PlotFrame) {
  const chars = Array.from(text)
  let end = 1
  while (
    end < chars.length &&
    labelWidth(prefix(chars, end + 1), frame) <= width
  )
    end++
  return prefix(chars, end)
}

export function fitLines(
  label: string,
  width: number,
  frame: PlotFrame,
  maxLines: number
): string[] {
  const fits = (line: string) => labelWidth(line, frame) <= width
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

type CategoryLabelOptions = CategoryFit & {
  /** The value at the plot's left edge. */
  x: number
  room: number
  frame: PlotFrame
  paint: ChartPaint
  /** Names that survive thinning, such as a highlight. */
  keep?: readonly string[]
}

/**
 * Category names right-aligned in the left margin, each block centred on its
 * band. The key carries the full name for `withCategoryTitles`, and the line,
 * so a changed line is a new element rather than a stale one.
 */
export function categoryLabelMark(
  names: readonly string[],
  { x, room, lines, every, frame, paint, keep = [] }: CategoryLabelOptions
): ChartMark {
  const lineHeight = frame.fontSize * LINE_HEIGHT
  const shown = thinNames(names, every, keep)
  const data = shown.flatMap((name) => {
    const fitted = fitLines(name, room - PADDING, frame, lines)
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

// The characters the engine's own escaping swaps for U+FFFD, which XML forbids.
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|\p{Cs}/gu

// The engine writes a key as `<mark>:<z>:string:<length>:<key>`, key last.
const CATEGORY_TEXT = new RegExp(
  `<text data-ts-key="${MARK_ID}:[^"]*?:string:\\d+:([^"]*)"[^>]*>`,
  'g'
)

/** Puts each category label's full name in a `<title>`. */
export function withCategoryTitles(svg: string) {
  return svg.replace(CATEGORY_TEXT, (tag, encoded: string) => {
    try {
      const [name] = JSON.parse(unescapeXml(encoded)) as [string]
      return `${tag}<title>${escapeXml(name.replace(UNSAFE, '\uFFFD'))}</title>`
    } catch {
      return tag
    }
  })
}
