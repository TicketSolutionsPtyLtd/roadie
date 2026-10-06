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

/**
 * Roadie's comparisons, plus `App`, an app's own, such as similar venues.
 * Roadie works out dates only for its own; see `isBuiltInComparison`.
 */
export type Comparison<App extends string = never> =
  'previous-period' | 'previous-year' | AbsoluteRange | App

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
  | { kind: 'dates'; start: string; end: string }
  | { kind: 'instants'; start: number | null; end: number | null }

const HOUR = 3_600_000
const DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/

const MONTHS_IN: Record<'quarter' | 'year', number> = { quarter: 3, year: 12 }

/** Tells apart values already known to be valid; it does not validate. */
export function isAbsoluteRange(
  value: DateRangeValue | Comparison
): value is AbsoluteRange {
  return typeof value === 'object' && 'start' in value
}

/** Whether Roadie can work out a comparison's dates, as against an app's own. */
export function isBuiltInComparison(
  comparison: Comparison<string>
): comparison is Comparison {
  return (
    comparison === 'previous-period' ||
    comparison === 'previous-year' ||
    (typeof comparison === 'object' && comparison !== null)
  )
}

/** Tells apart values already known to be valid; it does not validate. */
export function isRollingRange(
  value: DateRangeValue | Comparison
): value is RollingRange {
  return typeof value === 'object' && 'direction' in value
}

/** Tells apart values already known to be valid; it does not validate. */
export function isPeriodRange(
  value: DateRangeValue | Comparison
): value is PeriodRange {
  return typeof value === 'object' && 'period' in value
}

function dates(start: string, end: string): ResolvedDateRange {
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
    if (Number.isNaN(new Date(other).getTime())) {
      throw new RangeError(`${amount} hours runs past the supported dates`)
    }
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
  if (zone) {
    const epoch = Date.parse(value)
    if (Number.isNaN(epoch)) {
      throw new RangeError(`Not a valid date-time: '${value}'`)
    }
    return { kind: 'instant', epoch }
  }
  // A date-time with no offset is a wall-clock time in the given zone.
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

export type ComparisonOptions = DateRangeOptions & {
  /**
   * Previous year only: go back 52 weeks instead of to the same dates, so
   * each day lines up with the same weekday. Mondays compare with Mondays.
   */
  alignWeekday?: boolean
  /**
   * The first day the data holds, as an ISO date. A comparison that starts
   * before it is partial, and one that ends before it is unavailable.
   */
  dataStart?: string
  /**
   * The last day the data holds, as an ISO date, for data recorded as it
   * happens, such as sales. A range that runs past it is still in progress,
   * so its comparison stops at the same point; one that starts after it has
   * no data, so its comparison is unavailable. A comparison past it is
   * partial or unavailable, as before `dataStart`. Leave it out for dates
   * already known ahead, such as shows coming up.
   */
  dataEnd?: string
}

/**
 * The range to compare with, and whether the data covers it. `partial` and
 * `unavailable` mean a delta would mislead: say "Not enough history" or
 * "Nothing to compare" instead.
 */
export type ResolvedComparison =
  | { status: 'available' | 'partial'; range: ResolvedDateRange }
  /** `range` is null when the range is open-ended or a single instant. */
  | { status: 'unavailable'; range: ResolvedDateRange | null }

type CalendarUnit = { days: number } | { months: number }

const NAMED_UNITS: Partial<
  Record<Extract<RelativeRange, string>, CalendarUnit>
> = {
  today: { days: 1 },
  tomorrow: { days: 1 },
  yesterday: { days: 1 },
  'this-week': { days: 7 },
  'next-week': { days: 7 },
  'last-week': { days: 7 },
  'this-weekend': { days: 7 },
  'this-month': { months: 1 },
  'next-month': { months: 1 },
  'last-month': { months: 1 }
}

function calendarUnit(value: DateRangeValue): CalendarUnit | null {
  if (isAbsoluteRange(value) || isRollingRange(value)) return null
  if (!isPeriodRange(value)) return NAMED_UNITS[value] ?? null
  if (value.period === 'day') return { days: 1 }
  if (value.period === 'week') return { days: 7 }
  return { months: value.period === 'month' ? 1 : MONTHS_IN[value.period] }
}

function shift(date: string, unit: CalendarUnit, times: number): string {
  return 'days' in unit
    ? addDays(date, unit.days * times)
    : addMonths(date, unit.months * times)
}

/**
 * The same span of the period before: a whole period for a whole one, and
 * as far in for one cut short, so month to date compares with last month to
 * the same day.
 */
function previousCalendar(
  start: string,
  end: string,
  unit: CalendarUnit,
  toDate: boolean
): ResolvedDateRange {
  const before = addDays(start, -1)
  const whole = !toDate && end === addDays(shift(start, unit, 1), -1)
  return dates(
    shift(start, unit, -1),
    whole ? before : minDate(before, shift(end, unit, -1))
  )
}

function yearEarlier(date: string, alignWeekday: boolean | undefined): string {
  return alignWeekday ? addDays(date, -364) : addMonths(date, -12)
}

function previousYearInstant(
  epoch: number,
  options: ComparisonOptions
): number {
  const clock = wallClockOf(epoch, options.timeZone)
  return zonedInstant(
    { ...clock, date: yearEarlier(clock.date, options.alignWeekday) },
    options.timeZone
  )
}

function assertDataDates({ dataStart, dataEnd }: ComparisonOptions) {
  for (const date of [dataStart, dataEnd]) {
    if (date !== undefined && !isPlainDate(date)) {
      throw new RangeError(`Not an ISO date: '${date}'`)
    }
  }
  if (dataStart && dataEnd && compareDates(dataStart, dataEnd) > 0) {
    throw new RangeError(`dataStart ${dataStart} is after dataEnd ${dataEnd}`)
  }
}

function endOfDayInstant(date: string, timeZone: string): number {
  return startOfDayInstant(addDays(date, 1), timeZone) - 1
}

/** The part of a range the data has reached, when it runs past `dataEnd`. */
function soFar(
  range: ResolvedDateRange,
  { dataEnd, timeZone }: ComparisonOptions
): ResolvedDateRange {
  if (!dataEnd) return range
  if (range.kind === 'dates') {
    return compareDates(range.start, dataEnd) <= 0 &&
      compareDates(range.end, dataEnd) > 0
      ? dates(range.start, dataEnd)
      : range
  }
  const last = endOfDayInstant(dataEnd, timeZone)
  const { start, end } = range
  return start !== null && end !== null && start <= last && end > last
    ? instants(start, last)
    : range
}

function startsAfterData(
  range: ResolvedDateRange,
  { dataEnd, timeZone }: ComparisonOptions
): boolean {
  if (!dataEnd) return false
  return range.kind === 'dates'
    ? compareDates(range.start, dataEnd) > 0
    : range.start! > endOfDayInstant(dataEnd, timeZone)
}

function covered(
  range: ResolvedDateRange,
  { dataStart, dataEnd, timeZone }: ComparisonOptions
): ResolvedComparison {
  const toEpoch = (date: string) => startOfDayInstant(date, timeZone)
  const [start, end] =
    range.kind === 'dates'
      ? [toEpoch(range.start), toEpoch(range.end)]
      : [range.start!, range.end!]
  const first = dataStart === undefined ? -Infinity : toEpoch(dataStart)
  const last =
    dataEnd === undefined
      ? Infinity
      : range.kind === 'dates'
        ? toEpoch(dataEnd)
        : endOfDayInstant(dataEnd, timeZone)
  if (end < first || start > last) return { status: 'unavailable', range }
  if (start < first || end > last) return { status: 'partial', range }
  return { status: 'available', range }
}

function previousRange(
  value: DateRangeValue,
  resolved: ResolvedDateRange,
  comparison: 'previous-period' | 'previous-year',
  options: ComparisonOptions,
  toDate: boolean
): ResolvedDateRange {
  if (resolved.kind === 'dates') {
    const { start, end } = resolved
    if (comparison === 'previous-year') {
      return dates(
        yearEarlier(start, options.alignWeekday),
        yearEarlier(end, options.alignWeekday)
      )
    }
    const unit = calendarUnit(value)
    if (unit) return previousCalendar(start, end, unit, toDate)
    const length = dayNumber(end) - dayNumber(start)
    const before = addDays(start, -1)
    return dates(addDays(before, -length), before)
  }
  const start = resolved.start!
  const end = resolved.end!
  if (comparison === 'previous-year') {
    const from = previousYearInstant(start, options)
    const to = previousYearInstant(end, options)
    // A DST gap or repeated hour can collapse or reverse the window; keep its length.
    return instants(from, to <= from ? from + (end - start) : to)
  }
  const before = start - 1
  return instants(before - (end - start), before)
}

/**
 * The range to compare `range` against, and how much of it the data covers.
 * The previous period of a calendar period is the one before it (this month
 * against last month); of any other range, the same length ending the day
 * before.
 */
export function resolveComparison(
  range: DateRangeValue,
  comparison: Comparison,
  options: ComparisonOptions
): ResolvedComparison {
  assertDataDates(options)
  if (!isBuiltInComparison(comparison))
    throw new RangeError(`Not one of Roadie's comparisons: '${comparison}'`)
  const resolved = resolveDateRange(range, options)
  if (
    resolved.kind === 'instants' &&
    (resolved.start === null ||
      resolved.end === null ||
      resolved.start === resolved.end)
  ) {
    return { status: 'unavailable', range: null }
  }
  const reached = soFar(resolved, options)
  const toDate =
    reached !== resolved || (isPeriodRange(range) && !!range.toDate)
  const compared = isAbsoluteRange(comparison)
    ? resolveAbsolute(comparison, options.timeZone)
    : previousRange(range, reached, comparison, options, toDate)
  // A period the data hasn't reached has nothing to set against anything.
  if (startsAfterData(resolved, options))
    return { status: 'unavailable', range: compared }
  return covered(compared, options)
}
