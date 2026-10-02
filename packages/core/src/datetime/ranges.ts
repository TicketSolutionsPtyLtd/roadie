/**
 * Date ranges, absolute or relative, and what they mean on a given day.
 *
 * Every relative word has one fixed meaning. A week runs Monday to Sunday
 * (or from `weekStart`), a weekend is Saturday and Sunday, rolling windows
 * count today, and the financial year starts in July unless told otherwise.
 */
import { type Instantish } from './format'
import {
  addDays,
  addMonths,
  compareDates,
  dayNumber,
  dayOfWeek,
  isPlainDate,
  plainDateOf,
  plainDateParts,
  startOfWeek,
  toPlainDate
} from './plainDate'
import { epochOf, startOfDayInstant, wallClockOf, zonedInstant } from './zone'

export type RollingRange = {
  direction: 'next' | 'past'
  amount: number
  unit: 'hour' | 'day' | 'week' | 'month'
}

export type PeriodRange = {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  /** 0 is the current period, -1 the last one, 1 the next. */
  offset: number
  /** Stops at today, as in "month to date". */
  toDate?: boolean
  /** Quarters and years follow `fiscalYearStart`. */
  fiscal?: boolean
}

export type RelativeRange =
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'this-week'
  | 'this-weekend'
  | 'next-week'
  | 'last-week'
  | 'this-month'
  | 'next-month'
  | 'last-month'
  | 'upcoming'
  | 'past'
  | 'ongoing'
  | RollingRange
  | PeriodRange

/** Absolute ends are inclusive, as an ISO date or date-time. */
export type AbsoluteRange = { start: string; end: string }

export type DateRangeValue = AbsoluteRange | RelativeRange

export type Comparison = 'previous-period' | 'previous-year' | AbsoluteRange

export type DateRangeOptions = {
  now: Instantish
  /** The zone whose calendar decides what "today" is. */
  timeZone: string
  /** 1 is Monday, the default, and 7 is Sunday. */
  weekStart?: number
  /** The month the financial year opens. Defaults to 7, July. */
  fiscalYearStart?: number
}

/**
 * Calendar ranges resolve to plain dates in the given zone; hour windows,
 * `upcoming`, `past`, `ongoing` and date-time ends resolve to epoch ms. Ends
 * are inclusive, and null is open.
 */
export type ResolvedDateRange =
  | { kind: 'dates'; start: string | null; end: string | null }
  | { kind: 'instants'; start: number | null; end: number | null }

const HOUR = 3_600_000
const DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/

const MONTHS_IN: Record<'quarter' | 'year', number> = { quarter: 3, year: 12 }

export function isAbsoluteRange(value: unknown): value is AbsoluteRange {
  return typeof value === 'object' && value !== null && 'start' in value
}

export function isRollingRange(value: unknown): value is RollingRange {
  return typeof value === 'object' && value !== null && 'direction' in value
}

export function isPeriodRange(value: unknown): value is PeriodRange {
  return typeof value === 'object' && value !== null && 'period' in value
}

function dates(start: string | null, end: string | null): ResolvedDateRange {
  return { kind: 'dates', start, end }
}

function instants(start: number | null, end: number | null): ResolvedDateRange {
  return { kind: 'instants', start, end }
}

function lastOfMonth(date: string): string {
  return addDays(addMonths(firstOfMonth(date), 1), -1)
}

function firstOfMonth(date: string): string {
  const { year, month } = plainDateParts(date)
  return toPlainDate(year, month, 1)
}

function minDate(a: string, b: string): string {
  return compareDates(a, b) <= 0 ? a : b
}

/** The first month of the quarter or year holding `today`, then shifted. */
function periodStart(
  today: string,
  months: number,
  firstMonth: number,
  offset: number
): string {
  const { year, month } = plainDateParts(today)
  const index = year * 12 + (month - 1) - (firstMonth - 1)
  const start = Math.floor(index / months) * months + (firstMonth - 1)
  const shifted = start + offset * months
  const startYear = Math.floor(shifted / 12)
  return toPlainDate(startYear, shifted - startYear * 12 + 1, 1)
}

function resolvePeriod(
  range: PeriodRange,
  today: string,
  options: DateRangeOptions
): ResolvedDateRange {
  const { period, offset, toDate, fiscal } = range
  assertInteger(offset, 'offset')
  const weekStart = options.weekStart ?? 1
  let start: string
  let end: string
  let todayThen: string
  if (period === 'day') {
    start = end = todayThen = addDays(today, offset)
  } else if (period === 'week') {
    start = addDays(startOfWeek(today, weekStart), 7 * offset)
    end = addDays(start, 6)
    todayThen = addDays(today, 7 * offset)
  } else {
    const months = period === 'month' ? 1 : MONTHS_IN[period]
    const firstMonth =
      fiscal && period !== 'month' ? fiscalYearStart(options) : 1
    start = periodStart(today, months, firstMonth, offset)
    end = addDays(addMonths(start, months), -1)
    todayThen = addMonths(today, offset * months)
  }
  return dates(start, toDate ? minDate(end, todayThen) : end)
}

function resolveRolling(
  range: RollingRange,
  now: number,
  today: string
): ResolvedDateRange {
  const { direction, amount, unit } = range
  assertInteger(amount, 'amount')
  if (amount < 1)
    throw new RangeError(`amount must be 1 or more, got ${amount}`)
  const sign = direction === 'next' ? 1 : -1
  if (unit === 'hour') {
    const other = now + sign * amount * HOUR
    return sign > 0 ? instants(now, other) : instants(other, now)
  }
  // Rolling windows count today, so "next 7 days" is today and six more.
  const far =
    unit === 'month'
      ? addDays(addMonths(today, sign * amount), -sign)
      : addDays(today, sign * (amount * (unit === 'week' ? 7 : 1) - 1))
  return sign > 0 ? dates(today, far) : dates(far, today)
}

function resolveNamed(
  range: Extract<RelativeRange, string>,
  now: number,
  today: string,
  options: DateRangeOptions
): ResolvedDateRange {
  const weekStart = options.weekStart ?? 1
  switch (range) {
    case 'today':
      return dates(today, today)
    case 'tomorrow':
      return dates(addDays(today, 1), addDays(today, 1))
    case 'yesterday':
      return dates(addDays(today, -1), addDays(today, -1))
    case 'this-week':
    case 'next-week':
    case 'last-week': {
      const shift = range === 'this-week' ? 0 : range === 'next-week' ? 7 : -7
      const start = addDays(startOfWeek(today, weekStart), shift)
      return dates(start, addDays(start, 6))
    }
    case 'this-weekend': {
      const day = dayOfWeek(today)
      const saturday = addDays(today, day === 7 ? -1 : 6 - day)
      return dates(saturday, addDays(saturday, 1))
    }
    case 'this-month':
      return dates(firstOfMonth(today), lastOfMonth(today))
    case 'next-month':
    case 'last-month': {
      const first = addMonths(
        firstOfMonth(today),
        range === 'next-month' ? 1 : -1
      )
      return dates(first, lastOfMonth(first))
    }
    case 'upcoming':
      return instants(now, null)
    case 'past':
      return instants(null, now)
    case 'ongoing':
      return instants(now, now)
  }
  throw new RangeError(`Unknown date range '${String(range)}'`)
}

type AbsoluteEnd =
  { kind: 'date'; date: string } | { kind: 'instant'; epoch: number }

function parseEnd(value: string, timeZone: string): AbsoluteEnd {
  if (isPlainDate(value)) return { kind: 'date', date: value }
  const m = DATE_TIME.exec(value)
  if (!m || !isPlainDate(m[1]!)) {
    throw new RangeError(`Not an ISO date or date-time: '${value}'`)
  }
  const [, date, hour, minute, second, fraction, zone] = m
  if (zone) {
    const epoch = Date.parse(value)
    if (Number.isNaN(epoch))
      throw new RangeError(`Not a valid date-time: '${value}'`)
    return { kind: 'instant', epoch }
  }
  // A date-time with no offset is a wall-clock time in the given zone.
  const clock = {
    date: date!,
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? 0),
    millisecond: Number((fraction ?? '0').padEnd(3, '0'))
  }
  if (clock.hour > 23 || clock.minute > 59 || clock.second > 59) {
    throw new RangeError(`Not a valid date-time: '${value}'`)
  }
  return { kind: 'instant', epoch: zonedInstant(clock, timeZone) }
}

export function resolveAbsolute(
  range: AbsoluteRange,
  timeZone: string
): ResolvedDateRange {
  const start = parseEnd(range.start, timeZone)
  const end = parseEnd(range.end, timeZone)
  if (start.kind === 'date' && end.kind === 'date') {
    if (compareDates(start.date, end.date) > 0) {
      throw new RangeError(`Range starts after it ends: ${range.start}`)
    }
    return dates(start.date, end.date)
  }
  const from =
    start.kind === 'instant'
      ? start.epoch
      : startOfDayInstant(start.date, timeZone)
  const to =
    end.kind === 'instant'
      ? end.epoch
      : startOfDayInstant(addDays(end.date, 1), timeZone) - 1
  if (from > to) {
    throw new RangeError(`Range starts after it ends: ${range.start}`)
  }
  return instants(from, to)
}

function fiscalYearStart({ fiscalYearStart = 7 }: DateRangeOptions): number {
  if (
    !Number.isInteger(fiscalYearStart) ||
    fiscalYearStart < 1 ||
    fiscalYearStart > 12
  ) {
    throw new RangeError(
      `fiscalYearStart must be 1 to 12, got ${fiscalYearStart}`
    )
  }
  return fiscalYearStart
}

function assertInteger(value: number, name: string) {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be a whole number, got ${value}`)
  }
}

/** What a range covers on the day `now` falls on, in `timeZone`. */
export function resolveDateRange(
  value: DateRangeValue,
  options: DateRangeOptions
): ResolvedDateRange {
  if (isAbsoluteRange(value)) return resolveAbsolute(value, options.timeZone)
  const now = epochOf(options.now)
  const today = plainDateOf(options.now, options.timeZone)
  if (isRollingRange(value)) return resolveRolling(value, now, today)
  if (isPeriodRange(value)) return resolvePeriod(value, today, options)
  return resolveNamed(value, now, today, options)
}

function previousYearInstant(epoch: number, timeZone: string): number {
  const clock = wallClockOf(epoch, timeZone)
  return zonedInstant({ ...clock, date: addMonths(clock.date, -12) }, timeZone)
}

/**
 * The range to compare `range` against. Null when the range is open-ended,
 * since an unbounded range has no length to repeat.
 */
export function resolveComparison(
  range: DateRangeValue,
  comparison: Comparison,
  options: DateRangeOptions
): ResolvedDateRange | null {
  if (isAbsoluteRange(comparison)) {
    return resolveAbsolute(comparison, options.timeZone)
  }
  const resolved = resolveDateRange(range, options)
  if (resolved.kind === 'dates') {
    const { start, end } = resolved
    if (start === null || end === null) return null
    if (comparison === 'previous-year') {
      return dates(addMonths(start, -12), addMonths(end, -12))
    }
    const length = dayNumber(end) - dayNumber(start)
    const before = addDays(start, -1)
    return dates(addDays(before, -length), before)
  }
  const { start, end } = resolved
  if (start === null || end === null) return null
  if (comparison === 'previous-year') {
    return instants(
      previousYearInstant(start, options.timeZone),
      previousYearInstant(end, options.timeZone)
    )
  }
  const before = start - 1
  return instants(before - (end - start), before)
}
