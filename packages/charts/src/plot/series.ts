import type { ChartPaint, Row } from './types'

export const SERIES_CAP = 6
export const OTHER = 'Other'
const OTHER_SLOT = 0

export function seriesNames(
  rows: readonly Row[],
  field: string | undefined,
  fallback: string
) {
  if (!field) return [fallback]
  const names: string[] = []
  for (const row of rows) {
    const name = row[field]
    if (name != null && !names.includes(String(name))) names.push(String(name))
  }
  return names
}

type Point = { series: string; y: number | null; x: number | string }

export function rollupOther<T extends Point>(
  points: readonly T[],
  cap = SERIES_CAP
): T[] {
  const totals = new Map<string, number>()
  for (const p of points)
    totals.set(p.series, (totals.get(p.series) ?? 0) + (p.y ?? 0))
  if (totals.size <= cap) return [...points]
  const kept = new Set(
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap - 1)
      .map(([name]) => name)
  )
  const others = new Map<string | number, T>()
  const result: T[] = []
  for (const p of points) {
    if (kept.has(p.series)) {
      result.push(p)
      continue
    }
    const current = others.get(p.x)
    const y = p.y === null ? (current?.y ?? null) : (current?.y ?? 0) + p.y
    others.set(p.x, { ...p, series: OTHER, y })
  }
  return [...result, ...others.values()]
}

export type SeriesStyle = {
  name: string
  color: string
  slot: number
  emphasis: 'highlight' | 'context' | 'palette' | 'other'
}

type Highlight = string | readonly string[] | undefined

export const asList = (value: Highlight): readonly string[] =>
  value === undefined ? [] : typeof value === 'string' ? [value] : value

function emphasisOf(name: string, highlight: Highlight) {
  const highlighted = asList(highlight)
  if (highlighted.length === 0) return undefined
  return highlighted.includes(name) ? 'highlight' : 'context'
}

export function emphasisColor(
  name: string,
  highlight: Highlight,
  paint: ChartPaint
): string | undefined {
  const emphasis = emphasisOf(name, highlight)
  return emphasis && paint[emphasis]
}

export function seriesStyles(
  names: readonly string[],
  options: {
    highlight?: string | readonly string[]
    palette?: 'categorical' | 'pair' | 'trio'
  },
  paint: ChartPaint
): SeriesStyle[] {
  const named = names.filter((n) => n !== OTHER)
  const set =
    options.palette === 'pair' || (!options.palette && named.length === 2)
      ? paint.pair
      : options.palette === 'trio' || (!options.palette && named.length === 3)
        ? paint.trio
        : paint.categorical
  return names.map((name, i): SeriesStyle => {
    if (name === OTHER)
      return { name, color: paint.other, slot: OTHER_SLOT, emphasis: 'other' }
    const slot = i + 1
    const emphasis = emphasisOf(name, options.highlight)
    if (emphasis) return { name, color: paint[emphasis], slot, emphasis }
    return { name, color: set[i % set.length]!, slot, emphasis: 'palette' }
  })
}

export const seriesMarkId = (slot: number) =>
  slot === OTHER_SLOT ? 'series-other' : `series-${slot}`
