import type { PlotCell, PlotX } from '@oztix/roadie-core/dashboard'
import { isWallTime, parseWallTime } from '@oztix/roadie-core/dataviz'

import type { Row } from './types'

const HOUR = 3_600_000
const DAY = 86_400_000
const LOCALE = 'en-AU'

export const parseX = (value: PlotX | PlotCell | undefined) =>
  parseWallTime(value)

export const hasTimeOfDay = (value: PlotX | PlotCell | undefined) =>
  typeof value === 'string' && /T\d{2}:\d{2}/.test(value)

export function isTimeField(rows: readonly Row[], field: string) {
  const values = rows.map((row) => row[field]).filter((v) => v != null)
  return values.length > 0 && values.every(isWallTime)
}

/**
 * About `count` ticks on whole hours, or whole days past a day, so no tick
 * lands partway through a day and no two ticks share a label.
 */
export function timeTicks(min: number, max: number, count = 4) {
  if (max <= min) return [min]
  const span = max - min
  const unit = span <= DAY ? HOUR : DAY
  const step = Math.max(1, Math.round(span / unit / (count - 1))) * unit
  const labels = new Set<string>()
  const ticks: number[] = []
  for (let tick = Math.ceil(min / unit) * unit; tick <= max; tick += step) {
    const label = formatTimeTick(tick, span)
    if (labels.has(label)) continue
    labels.add(label)
    ticks.push(tick)
  }
  return ticks
}

const part = (ms: number, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', ...options }).format(ms)

function clock(ms: number) {
  const date = new Date(ms)
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const suffix = hours < 12 ? 'am' : 'pm'
  const hour = hours % 12 || 12
  return minutes
    ? `${hour}:${String(minutes).padStart(2, '0')}${suffix}`
    : `${hour}${suffix}`
}

const shortDate = (ms: number) =>
  `${part(ms, { day: 'numeric' })} ${part(ms, { month: 'short' })}`

export function formatTimeTick(ms: number, spanMs: number) {
  return spanMs <= DAY ? clock(ms) : shortDate(ms)
}

export function formatTimeTitle(ms: number, hasTime: boolean) {
  const date = `${part(ms, { weekday: 'short' })} ${shortDate(ms)}`
  return hasTime ? `${date}, ${clock(ms)}` : date
}

export function spokenX(ms: number, hasTime: boolean) {
  const date = `${part(ms, { weekday: 'long' })} ${part(ms, { day: 'numeric' })} ${part(ms, { month: 'long' })}`
  return hasTime ? `${date}, ${clock(ms)}` : date
}
