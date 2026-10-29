import { type Instantish, dateTimeFormat } from './format'
import { isPlainDate, plainDateParts } from './plainDate'

function wallClockFormat(timeZone: string): Intl.DateTimeFormat {
  return dateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    era: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  })
}

export function epochOf(instant: Instantish): number {
  return instant instanceof Date ? instant.getTime() : instant.epochMilliseconds
}

/** How far the zone's wall clock is ahead of UTC at an instant, in ms. */
function offsetAt(epoch: number, timeZone: string): number {
  const parts = wallClockFormat(timeZone).formatToParts(new Date(epoch))
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value)
  // Intl counts 1 BC as year 1 of the BC era; the proleptic year is 0.
  const year =
    parts.find((p) => p.type === 'era')?.value === 'BC'
      ? 1 - get('year')
      : get('year')
  const wall = new Date(0)
  wall.setUTCFullYear(year, get('month') - 1, get('day'))
  wall.setUTCHours(get('hour') % 24, get('minute'), get('second'))
  return wall.getTime() - Math.floor(epoch / 1000) * 1000
}

export type WallClock = {
  date: string
  hour: number
  minute: number
  second: number
  millisecond: number
}

const WALL_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

function wallClockFrom(wallTime: string): WallClock {
  const [, date, hour, minute, second = '00'] = WALL_TIME.exec(wallTime) ?? []
  const clock = {
    date: date ?? '',
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: 0
  }
  if (
    !isPlainDate(clock.date) ||
    clock.hour > 23 ||
    clock.minute > 59 ||
    clock.second > 59
  ) {
    throw new RangeError(`Not an ISO wall time: '${wallTime}'`)
  }
  return clock
}

/** Where a wall-clock time falls: its first pass, or the gap it's skipped in. */
function placeClock(
  clock: WallClock,
  timeZone: string
):
  | { kind: 'exact'; at: number }
  | { kind: 'skipped'; low: number; high: number } {
  const { year, month, day } = plainDateParts(clock.date)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(clock.hour, clock.minute, clock.second, clock.millisecond)
  const local = date.getTime()
  const before = local - offsetAt(local - 86_400_000, timeZone)
  const after = local - offsetAt(local + 86_400_000, timeZone)
  const candidates = [before, after].filter(
    (t) => t + offsetAt(t, timeZone) === local
  )
  if (candidates.length) return { kind: 'exact', at: Math.min(...candidates) }
  return {
    kind: 'skipped',
    low: Math.min(before, after),
    high: Math.max(before, after)
  }
}

/**
 * The instant a wall-clock time names in a zone. A time skipped by a DST jump
 * moves on by the jump's size; a time that happens twice takes the earlier one.
 */
export function clockInstant(clock: WallClock, timeZone: string): number {
  const place = placeClock(clock, timeZone)
  return place.kind === 'exact' ? place.at : place.high
}

/**
 * The instant a venue's wall-clock time names in its zone, such as
 * `zonedInstant('2026-11-28T19:30', 'Australia/Brisbane')`. Takes
 * `YYYY-MM-DDTHH:mm`, with seconds optional. A time daylight saving skips
 * moves on by the jump's size; a repeated time takes the first. Anything else,
 * including an offset or `Z`, throws a `RangeError`.
 */
export function zonedInstant(wallTime: string, timeZone: string): Date {
  return new Date(clockInstant(wallClockFrom(wallTime), timeZone))
}

export function startOfDayInstant(date: string, timeZone: string): number {
  return clockInstant(
    { date, hour: 0, minute: 0, second: 0, millisecond: 0 },
    timeZone
  )
}

export function wallClockOf(epoch: number, timeZone: string): WallClock {
  const shifted = new Date(epoch + offsetAt(epoch, timeZone))
  const date = shifted.toISOString().slice(0, 10)
  return {
    date,
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds()
  }
}

/**
 * The one instant a wall-clock time names: its first pass when the clock
 * repeats it, or the jump when daylight saving skips it. Records bounds need
 * this rather than `clockInstant`, which reads 2:59am in a gap as after 3am;
 * this never goes backwards as the wall clock goes forwards.
 */
export function wallInstant(clock: WallClock, timeZone: string): number {
  const place = placeClock(clock, timeZone)
  return place.kind === 'exact'
    ? place.at
    : transitionBetween(place.low, place.high, timeZone)
}

/** The first instant at or after `low` that already has `high`'s offset. */
function transitionBetween(low: number, high: number, timeZone: string) {
  const target = offsetAt(high, timeZone)
  let [lo, hi] = [low, high]
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (offsetAt(mid, timeZone) === target) hi = mid
    else lo = mid
  }
  return offsetAt(lo, timeZone) === target ? lo : hi
}
