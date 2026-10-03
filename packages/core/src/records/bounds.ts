import { addDays, isPlainDate } from '../datetime/plainDate'
import { resolveAbsolute } from '../datetime/ranges'
import { startOfDayInstant, wallInstant } from '../datetime/zone'

const WALL_CLOCK =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/

export type Bound =
  { kind: 'date'; date: string } | { kind: 'instant'; at: number }

/**
 * One end of a range, or a row's own time. A wall-clock time without an
 * offset names one instant: its first pass when the clock repeats it, or the
 * jump when daylight saving skips it.
 */
export function readBound(value: string, timeZone: string): Bound {
  if (isPlainDate(value)) return { kind: 'date', date: value }
  const wall = WALL_CLOCK.exec(value)
  if (!wall) {
    const epoch = resolveAbsolute({ start: value, end: value }, timeZone)
    return { kind: 'instant', at: epoch.start as number }
  }
  const [, date, hour, minute, second, fraction] = wall
  if (
    !isPlainDate(date!) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second ?? 0) > 59
  ) {
    throw new RangeError(`Not a valid date-time: '${value}'`)
  }
  const clock = {
    date: date!,
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? 0),
    millisecond: Number((fraction ?? '0').padEnd(3, '0'))
  }
  return { kind: 'instant', at: wallInstant(clock, timeZone) }
}

export function boundStart(bound: Bound, timeZone: string): number {
  return bound.kind === 'instant'
    ? bound.at
    : startOfDayInstant(bound.date, timeZone)
}

export function boundEnd(bound: Bound, timeZone: string): number {
  return bound.kind === 'instant'
    ? bound.at
    : startOfDayInstant(addDays(bound.date, 1), timeZone) - 1
}

/** A row holds one instant, as an index does; a plain date is its day's start. */
export function rowInstant(value: string, timeZone: string): number {
  return boundStart(readBound(value, timeZone), timeZone)
}
