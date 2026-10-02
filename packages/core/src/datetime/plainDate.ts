/**
 * Calendar dates with no clock and no zone, as ISO 'YYYY-MM-DD' strings.
 *
 * A plain date is never shifted: '2026-11-27' is 27 November wherever it is
 * read. The arithmetic runs on UTC day numbers, which have no daylight saving,
 * so a changeover day is still one day long.
 */
import { type Instantish, formatMachine } from './format'

const MS_PER_DAY = 86_400_000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export type PlainDateParts = { year: number; month: number; day: number }

export function toPlainDate(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || year < 0 || year > 9999) {
    throw new RangeError(`Year ${year} is outside 0000 to 9999`)
  }
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function isPlainDate(value: string): boolean {
  const m = ISO_DATE.exec(value)
  if (!m) return false
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  )
}

export function plainDateParts(date: string): PlainDateParts {
  if (!isPlainDate(date)) {
    throw new RangeError(`Not an ISO date: '${date}'`)
  }
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number
  ]
  return { year, month, day }
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

// Date.UTC maps years 0 to 99 onto the 1900s; setUTCFullYear does not.
function utcMidnight(year: number, month: number, day: number): number {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getTime()
}

export function dayNumber(date: string): number {
  const { year, month, day } = plainDateParts(date)
  return utcMidnight(year, month, day) / MS_PER_DAY
}

export function fromDayNumber(days: number): string {
  const date = new Date(days * MS_PER_DAY)
  return toPlainDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
}

/**
 * The calendar date of an instant in a zone. Pass the venue's zone for an
 * event time and the viewer's for a timestamp.
 */
export function plainDateOf(instant: Instantish, timeZone: string): string {
  const date = formatMachine(instant, { timeZone })
  if (!date) throw new RangeError('Not a valid instant')
  return date
}

function assertWholeNumber(value: number, name: string) {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be a whole number, got ${value}`)
  }
}

export function addDays(date: string, days: number): string {
  assertWholeNumber(days, 'days')
  return fromDayNumber(dayNumber(date) + days)
}

/** Clamps to the month's last day: 31 Jan plus a month is 28 or 29 Feb. */
export function addMonths(date: string, months: number): string {
  assertWholeNumber(months, 'months')
  const { year, month, day } = plainDateParts(date)
  const index = year * 12 + (month - 1) + months
  const targetYear = Math.floor(index / 12)
  const targetMonth = index - targetYear * 12 + 1
  return toPlainDate(
    targetYear,
    targetMonth,
    Math.min(day, daysInMonth(targetYear, targetMonth))
  )
}

export function compareDates(a: string, b: string): -1 | 0 | 1 {
  const diff = dayNumber(a) - dayNumber(b)
  return diff < 0 ? -1 : diff > 0 ? 1 : 0
}

/** 1 is Monday and 7 is Sunday, as in ISO 8601 and Temporal. */
export function dayOfWeek(date: string): number {
  // Day 0 of the epoch, 1 Jan 1970, was a Thursday.
  return ((((dayNumber(date) + 3) % 7) + 7) % 7) + 1
}

function assertWeekStart(weekStart: number) {
  if (!Number.isInteger(weekStart) || weekStart < 1 || weekStart > 7) {
    throw new RangeError(`weekStart must be 1 to 7, got ${weekStart}`)
  }
}

export function startOfWeek(date: string, weekStart = 1): string {
  assertWeekStart(weekStart)
  return addDays(date, -((dayOfWeek(date) - weekStart + 7) % 7))
}

export type MonthGridOptions = {
  /** 1 is Monday, the default, and 7 is Sunday. */
  weekStart?: number
  /** Always six weeks, so a calendar keeps its height from month to month. */
  fixedWeeks?: boolean
}

/**
 * A month as weeks of seven ISO dates, including the days from the months
 * either side that fill the first and last weeks.
 */
export function monthGrid(
  year: number,
  month: number,
  { weekStart = 1, fixedWeeks = false }: MonthGridOptions = {}
): string[][] {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be 1 to 12, got ${month}`)
  }
  const first = toPlainDate(year, month, 1)
  const last = toPlainDate(year, month, daysInMonth(year, month))
  let cursor = startOfWeek(first, weekStart)
  const weeks: string[][] = []
  while (fixedWeeks ? weeks.length < 6 : compareDates(cursor, last) <= 0) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(cursor, i))
    weeks.push(week)
    cursor = addDays(cursor, 7)
  }
  return weeks
}
