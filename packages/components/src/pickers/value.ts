import { formatMachine, resolveDateRange } from '@oztix/roadie-core/datetime'

export type DateTimeParts = { date: string | null; time: string | null }

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/
const WALL_CLOCK = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/
const WITH_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/

function wallClockIn(epoch: number, timeZone: string): DateTimeParts | null {
  const machine = formatMachine(new Date(epoch), {
    timeZone,
    timeStyle: 'numeric'
  })
  const m = machine && WALL_CLOCK.exec(machine.replace(WITH_OFFSET, ''))
  return m ? { date: m[1]!, time: m[2]! } : null
}

/** A value's date and time on the wall clock of `timeZone`. */
export function splitValue(
  value: string | null | undefined,
  timeZone: string
): DateTimeParts {
  const empty = { date: null, time: null }
  if (!value) return empty
  if (PLAIN_DATE.test(value)) return { date: value, time: null }
  if (WITH_OFFSET.test(value)) {
    const epoch = Date.parse(value)
    return Number.isNaN(epoch) ? empty : (wallClockIn(epoch, timeZone) ?? empty)
  }
  const m = WALL_CLOCK.exec(value)
  return m ? { date: m[1]!, time: m[2]! } : empty
}

/**
 * A plain date at day granularity. At minute granularity, the instant the
 * wall-clock date and time name in `timeZone`, with its offset, or null until
 * both are known.
 */
export function joinValue(
  { date, time }: DateTimeParts,
  granularity: 'day' | 'minute',
  timeZone: string
): string | null {
  if (granularity === 'day') return date
  if (!date || !time) return null
  const wallClock = `${date}T${time}`
  const range = resolveDateRange(
    { start: wallClock, end: wallClock },
    { now: new Date(0), timeZone }
  )
  if (range.kind !== 'instants' || range.start === null) return null
  return formatMachine(new Date(range.start), {
    timeZone,
    timeStyle: 'numeric'
  })
}
