import { type Instantish } from './format'
import { plainDateParts } from './plainDate'

const formatters = new Map<string, Intl.DateTimeFormat>()

function wallClockFormat(timeZone: string): Intl.DateTimeFormat {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
    formatters.set(timeZone, format)
  }
  return format
}

export function epochOf(instant: Instantish): number {
  return instant instanceof Date ? instant.getTime() : instant.epochMilliseconds
}

/** How far the zone's wall clock is ahead of UTC at an instant, in ms. */
function offsetAt(epoch: number, timeZone: string): number {
  const parts = wallClockFormat(timeZone).formatToParts(new Date(epoch))
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value)
  const wall = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  )
  return wall - Math.floor(epoch / 1000) * 1000
}

export type WallClock = {
  date: string
  hour: number
  minute: number
  second: number
  millisecond: number
}

/**
 * The instant a wall-clock time names in a zone. A time skipped by a DST jump
 * lands after the jump; a time that happens twice takes the earlier one.
 */
export function zonedInstant(clock: WallClock, timeZone: string): number {
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
  if (candidates.length) return Math.min(...candidates)
  return Math.max(before, after)
}

export function startOfDayInstant(date: string, timeZone: string): number {
  return zonedInstant(
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
