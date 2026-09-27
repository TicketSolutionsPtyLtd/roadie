import type { PlotCell, PlotX } from '@oztix/roadie-core/dashboard'
import { isWallTime, parseWallTime } from '@oztix/roadie-core/dataviz'

import type { Row } from './types'

const HOUR = 3_600_000
const DAY = 86_400_000
const LOCALE = 'en-AU'

export const parseX = (value: PlotX | PlotCell | undefined) =>
  parseWallTime(value)

const DATE_THEN_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

export const hasTimeOfDay = (value: PlotX | PlotCell | undefined) =>
  isWallTime(value) && DATE_THEN_TIME.test(value)

export function isTimeField(rows: readonly Row[], field: string) {
  const values = rows.map((row) => row[field]).filter((v) => v != null)
  return values.length > 0 && values.every(isWallTime)
}

const SHORT_RANGE = 3 * DAY
const QUARTER_DAY = 6 * HOUR

// Each step starts on a multiple of its unit: an hour, a quarter day or a day.
function tickStep(span: number, count: number, hasTime: boolean) {
  const raw = span / (count - 1)
  const steps = (unit: number) => Math.max(1, Math.round(raw / unit)) * unit
  if (span <= DAY) return { step: steps(HOUR), unit: HOUR }
  // A day or two of timed data would otherwise get one or two midnight ticks.
  if (hasTime && span < SHORT_RANGE) {
    const step = raw > 9 * HOUR ? 2 * QUARTER_DAY : QUARTER_DAY
    return { step, unit: step }
  }
  return { step: steps(DAY), unit: DAY }
}

/**
 * About `count` ticks on whole hours, quarter days across a short timed range,
 * or whole days, so no tick lands at an odd time and no two share a label.
 */
export function timeTicks(
  min: number,
  max: number,
  { count = 4, hasTime = false }: { count?: number; hasTime?: boolean } = {}
) {
  if (max <= min) return [min]
  const span = max - min
  const { step, unit } = tickStep(span, count, hasTime)
  const ticks: number[] = []
  for (let tick = Math.ceil(min / unit) * unit; tick <= max; tick += step)
    ticks.push(tick)
  // A full day of hours ends on the clock time it started at.
  const clocks = new Set<string>()
  return span > DAY
    ? ticks
    : ticks.filter((tick) => {
        const label = clock(tick)
        if (clocks.has(label)) return false
        clocks.add(label)
        return true
      })
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

/** A clock time within a day, and a date past it. A short range dates midnight. */
export function formatTimeTick(ms: number, spanMs: number) {
  if (spanMs <= DAY) return clock(ms)
  if (spanMs < SHORT_RANGE && ms % DAY !== 0) return clock(ms)
  return shortDate(ms)
}

export function formatTimeTitle(ms: number, hasTime: boolean) {
  const date = `${part(ms, { weekday: 'short' })} ${shortDate(ms)}`
  return hasTime ? `${date}, ${clock(ms)}` : date
}

export function spokenX(ms: number, hasTime: boolean) {
  const date = `${part(ms, { weekday: 'long' })} ${part(ms, { day: 'numeric' })} ${part(ms, { month: 'long' })}`
  return hasTime ? `${date}, ${clock(ms)}` : date
}
