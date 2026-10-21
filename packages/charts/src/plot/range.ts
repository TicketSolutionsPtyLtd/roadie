import type { AbsoluteRange } from '@oztix/roadie-core/datetime'

import { clock, spokenX } from './time'
import { nounFor } from './words'

const DAY = 86_400_000
const LOCALE = 'en-AU'

export type RangeOptions = {
  hasTime: boolean
  /** Days each x covers past its own, such as 7 for weeks. @default 1 */
  bucketDays?: number
}

/** The x values a chart's range brush snaps to, and how to read two of them. */
export type RangeAxis = {
  values: readonly (number | string)[]
  /** Wall-time ms of an x value. */
  msOf: (value: number | string) => number | null
  options: RangeOptions
}

const ordered = (a: number, b: number): [number, number] =>
  a <= b ? [a, b] : [b, a]

const lastMs = (ms: number, { hasTime, bucketDays = 1 }: RangeOptions) =>
  hasTime ? ms : ms + (bucketDays - 1) * DAY

function isoWallTime(ms: number, hasTime: boolean) {
  const iso = new Date(ms).toISOString()
  return hasTime ? iso.slice(0, 16) : iso.slice(0, 10)
}

/** Two bucket starts as an inclusive range in venue wall time, never shifted. */
export function wallRange(
  from: number,
  to: number,
  options: RangeOptions
): AbsoluteRange {
  const [start, end] = ordered(from, to)
  return {
    start: isoWallTime(start, options.hasTime),
    end: isoWallTime(lastMs(end, options), options.hasTime)
  }
}

const part = (ms: number, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', ...options }).format(ms)

const dayMonth = (ms: number) =>
  `${part(ms, { day: 'numeric' })} ${part(ms, { month: 'long' })}`

function spokenDays(start: number, end: number) {
  const sameMonth =
    part(start, { month: 'long', year: 'numeric' }) ===
    part(end, { month: 'long', year: 'numeric' })
  return sameMonth
    ? `${part(start, { day: 'numeric' })} to ${dayMonth(end)}`
    : `${dayMonth(start)} to ${dayMonth(end)}`
}

function spokenTimes(start: number, end: number) {
  const sameDay = Math.floor(start / DAY) === Math.floor(end / DAY)
  return sameDay
    ? `${spokenX(start, true)} to ${clock(end)}`
    : `${spokenX(start, true)} to ${spokenX(end, true)}`
}

export function spokenRange(from: number, to: number, options: RangeOptions) {
  const [start, end] = ordered(from, to)
  const last = lastMs(end, options)
  const days = Math.round((last - start) / DAY) + 1
  const weeks = options.bucketDays === 7
  const count = weeks ? days / 7 : days
  const span = options.hasTime
    ? spokenTimes(start, last)
    : `${spokenDays(start, last)}, ${count} ${nounFor(count, weeks ? 'weeks' : 'days')}`
  return `Selected ${span}. Enter to apply.`
}
