import { addDays, isPlainDate } from '../datetime/plainDate'
import { resolveAbsolute } from '../datetime/ranges'
import { startOfDayInstant, wallBoundInstant } from '../datetime/zone'

const WALL_CLOCK =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/

export type Bound =
  | { kind: 'date'; date: string }
  | { kind: 'instant'; start: number; end: number }

/**
 * One end of a range. A wall-clock time without an offset bounds a range
 * by the first moment the clock shows it (a start) or the last (an end), so
 * a time skipped by a DST jump starts at the jump and a repeated time ends on
 * its second pass.
 */
export function readBound(value: string, timeZone: string): Bound {
  if (isPlainDate(value)) return { kind: 'date', date: value }
  const wall = WALL_CLOCK.exec(value)
  if (!wall) {
    const epoch = resolveAbsolute({ start: value, end: value }, timeZone)
    return {
      kind: 'instant',
      start: epoch.start as number,
      end: epoch.end as number
    }
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
  return {
    kind: 'instant',
    start: wallBoundInstant(clock, timeZone, 'start'),
    end: wallBoundInstant(clock, timeZone, 'end')
  }
}

export function boundStart(bound: Bound, timeZone: string): number {
  return bound.kind === 'instant'
    ? bound.start
    : startOfDayInstant(bound.date, timeZone)
}

export function boundEnd(bound: Bound, timeZone: string): number {
  return bound.kind === 'instant'
    ? bound.end
    : startOfDayInstant(addDays(bound.date, 1), timeZone) - 1
}

/**
 * A row's own time as a span of instants. A time skipped by a DST jump reads
 * as the jump, like a filter bound; a repeated time spans both passes.
 */
export function rowInstantSpan(
  value: string,
  timeZone: string
): [number, number] {
  const bound = readBound(value, timeZone)
  const start = boundStart(bound, timeZone)
  return [start, Math.max(start, boundEnd(bound, timeZone))]
}
