import type { PlotCell, PlotX } from '@oztix/roadie-core/dashboard'
import { isWallTime, parseWallTime } from '@oztix/roadie-core/dataviz'
import { formatDateTime, formatTimeOfDay } from '@oztix/roadie-core/datetime'

import type { Row } from './types'

const HOUR = 3_600_000
const DAY = 86_400_000

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
        const label = tickClock(tick)
        if (clocks.has(label)) return false
        clocks.add(label)
        return true
      })
}

// Plot x is wall time held as UTC milliseconds, so it formats in UTC.
const at = (ms: number) => ({ epochMilliseconds: ms })
const WALL = { timeZone: 'UTC' } as const

const tickClock = (ms: number) =>
  formatTimeOfDay(at(ms), { ...WALL, timeStyle: 'numeric' }) ?? ''

/** A clock time for prose, such as the end of a spoken range. */
export const clock = (ms: number) =>
  formatTimeOfDay(at(ms), { ...WALL, timeStyle: 'medium' }) ?? ''

const shortDate = (ms: number) =>
  formatDateTime(at(ms), { ...WALL, dateStyle: 'short' }) ?? ''

/** A clock time within a day, and a date past it. A short range dates midnight. */
export function formatTimeTick(ms: number, spanMs: number) {
  if (spanMs <= DAY) return tickClock(ms)
  if (spanMs < SHORT_RANGE && ms % DAY !== 0) return tickClock(ms)
  return shortDate(ms)
}

export const formatTimeTitle = (ms: number, hasTime: boolean) =>
  formatDateTime(at(ms), {
    ...WALL,
    dateStyle: 'long',
    timeStyle: hasTime ? 'medium' : undefined
  }) ?? ''

export const spokenX = (ms: number, hasTime: boolean) =>
  formatDateTime(at(ms), {
    ...WALL,
    dateStyle: 'full',
    timeStyle: hasTime ? 'medium' : undefined
  }) ?? ''

export const formatTimeCell = (ms: number, hasTime: boolean) =>
  formatDateTime(at(ms), {
    ...WALL,
    dateStyle: 'long',
    timeStyle: hasTime ? 'numeric' : undefined
  }) ?? ''
