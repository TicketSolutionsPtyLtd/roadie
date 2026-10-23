import {
  type AbsoluteRange,
  formatDateRange
} from '@oztix/roadie-core/datetime'

import { spokenX } from './time'
import { nounFor } from './words'

const DAY = 86_400_000

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
  /** Each value is a band, so a range covers its end values whole. */
  bands?: boolean
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

const spokenDates = (start: number, end: number, hasTime: boolean) =>
  formatDateRange(new Date(start), new Date(end), {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: hasTime ? 'medium' : undefined
  }) ?? ''

export function spokenRange(from: number, to: number, options: RangeOptions) {
  const [start, end] = ordered(from, to)
  const last = lastMs(end, options)
  const days = Math.round((last - start) / DAY) + 1
  const weeks = options.bucketDays === 7
  const count = weeks ? days / 7 : days
  const dates = spokenDates(start, last, options.hasTime)
  const span = options.hasTime
    ? dates
    : `${dates}, ${count} ${nounFor(count, weeks ? 'weeks' : 'days')}`
  return `Selected ${span}. Enter to apply.`
}

/** How a brush handle reads its value. */
export function spokenValue(ms: number, options: RangeOptions) {
  const when = spokenX(ms, options.hasTime)
  return options.bucketDays === 7 ? `Week of ${when}` : when
}
