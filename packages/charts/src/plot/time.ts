import type { PlotCell, PlotX } from '@oztix/roadie-core/dashboard'
import { isWallTime, parseWallTime } from '@oztix/roadie-core/dataviz'

import type { Row } from './types'

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

export function timeTicks(min: number, max: number, count = 4) {
  if (max <= min) return [min]
  const step = (max - min) / (count - 1)
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? max : min + Math.round(i * step)
  )
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
