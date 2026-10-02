/**
 * Typed date phrases to explicit values, for date fields and filter chips.
 *
 * A phrase never becomes its own hidden meaning. Each suggestion carries a
 * value with one fixed reading and a label that says what it is. A word with
 * two readings, like "next fri" on a Wednesday, offers both as dates.
 *
 * A date typed without a year takes the occurrence closest to today, either
 * way, so "14 mar" in October is next March and "20 sep" is last month. A
 * tie goes to the future.
 */
import { formatResolved, plainDateInstant, relativeLabel } from './describe'
import { formatDateTime, formatTimeOfDay } from './format'
import {
  addDays,
  compareDates,
  dayNumber,
  dayOfWeek,
  isPlainDate,
  plainDateOf,
  plainDateParts,
  startOfWeek,
  toPlainDate
} from './plainDate'
import {
  type DateRangeOptions,
  type DateRangeValue,
  type RollingRange,
  resolveDateRange
} from './ranges'

export type DatePhraseOptions = Omit<DateRangeOptions, 'fiscalYearStart'> & {
  locale?: string
}

export type DatePhraseValue =
  | DateRangeValue
  | { on: string }
  | { before: string }
  | { after: string }
  /** A wall-clock time, 'HH:MM' on a 24-hour clock. */
  | { time: string }

export type DatePhraseSuggestion = { label: string; value: DatePhraseValue }

const PHRASES: [string, DateRangeValue][] = [
  ['today', 'today'],
  ['tomorrow', 'tomorrow'],
  ['yesterday', 'yesterday'],
  ['this week', 'this-week'],
  ['this weekend', 'this-weekend'],
  ['this month', 'this-month'],
  ['this quarter', { period: 'quarter', offset: 0 }],
  ['this year', { period: 'year', offset: 0 }],
  ['this financial year', { period: 'year', offset: 0, fiscal: true }],
  ['next week', 'next-week'],
  ['next month', 'next-month'],
  ['next quarter', { period: 'quarter', offset: 1 }],
  ['next year', { period: 'year', offset: 1 }],
  ['next financial year', { period: 'year', offset: 1, fiscal: true }],
  ['last week', 'last-week'],
  ['last month', 'last-month'],
  ['last quarter', { period: 'quarter', offset: -1 }],
  ['last year', { period: 'year', offset: -1 }],
  ['last financial year', { period: 'year', offset: -1, fiscal: true }],
  ['week to date', { period: 'week', offset: 0, toDate: true }],
  ['month to date', { period: 'month', offset: 0, toDate: true }],
  ['quarter to date', { period: 'quarter', offset: 0, toDate: true }],
  ['year to date', { period: 'year', offset: 0, toDate: true }],
  [
    'financial year to date',
    { period: 'year', offset: 0, fiscal: true, toDate: true }
  ],
  ['upcoming', 'upcoming'],
  ['past', 'past'],
  ['ongoing', 'ongoing'],
  ['happening now', 'ongoing']
]

// Exact matches only, never completed: each hides an explicit range.
const ALIASES: Record<string, DateRangeValue> = {
  fortnight: { direction: 'next', amount: 14, unit: 'day' },
  'next fortnight': { direction: 'next', amount: 14, unit: 'day' },
  'last fortnight': { direction: 'past', amount: 14, unit: 'day' },
  'past fortnight': { direction: 'past', amount: 14, unit: 'day' },
  'past week': { direction: 'past', amount: 1, unit: 'week' },
  'past month': { direction: 'past', amount: 1, unit: 'month' },
  'this fy': { period: 'year', offset: 0, fiscal: true },
  'last fy': { period: 'year', offset: -1, fiscal: true },
  'next fy': { period: 'year', offset: 1, fiscal: true },
  wtd: { period: 'week', offset: 0, toDate: true },
  mtd: { period: 'month', offset: 0, toDate: true },
  qtd: { period: 'quarter', offset: 0, toDate: true },
  ytd: { period: 'year', offset: 0, toDate: true },
  fytd: { period: 'year', offset: 0, fiscal: true, toDate: true }
}

const UNITS: Record<string, RollingRange['unit']> = {
  hour: 'hour',
  hr: 'hour',
  day: 'day',
  week: 'week',
  wk: 'week',
  month: 'month',
  mth: 'month'
}
const UNIT_ORDER: RollingRange['unit'][] = ['day', 'week', 'month', 'hour']

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
]
const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]
const SHORT_FORMS: Record<string, string> = {
  sept: 'september',
  tues: 'tuesday',
  weds: 'wednesday',
  thur: 'thursday',
  thurs: 'thursday'
}

type PartialDate = { day: number; month?: number; year?: number }

function nameIndex(names: string[], word: string): number | null {
  const full = SHORT_FORMS[word] ?? word
  const index = names.findIndex(
    (name) => name === full || name.slice(0, 3) === full
  )
  return index < 0 ? null : index + 1
}

function fullYear(text: string | undefined): number | undefined {
  if (text === undefined) return undefined
  return text.length === 2 ? 2000 + Number(text) : Number(text)
}

const DAY_MONTH = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)(?: (\d{4}))?$/
const MONTH_DAY = /^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/
const SLASHED = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/
const BARE_DAY = /^(\d{1,2})(?:st|nd|rd|th)?$/

function parsePartial(text: string, bareDay: boolean): PartialDate | null {
  if (isPlainDate(text)) return plainDateParts(text)
  let m = SLASHED.exec(text)
  if (m) {
    return { day: Number(m[1]), month: Number(m[2]), year: fullYear(m[3]) }
  }
  m = DAY_MONTH.exec(text)
  if (m) {
    const month = nameIndex(MONTHS, m[2]!)
    return month ? { day: Number(m[1]), month, year: fullYear(m[3]) } : null
  }
  m = MONTH_DAY.exec(text)
  if (m) {
    const month = nameIndex(MONTHS, m[1]!)
    return month ? { day: Number(m[2]), month, year: fullYear(m[3]) } : null
  }
  m = BARE_DAY.exec(text)
  return m && bareDay ? { day: Number(m[1]) } : null
}

function dateIn(year: number, month: number, day: number): string | null {
  const date = toPlainDate(year, month, day)
  return isPlainDate(date) ? date : null
}

function closestTo(today: string, month: number, day: number): string | null {
  const { year } = plainDateParts(today)
  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of [year - 1, year, year + 1]) {
    const date = dateIn(candidate, month, day)
    if (!date) continue
    const distance = Math.abs(dayNumber(date) - dayNumber(today))
    if (distance <= bestDistance) {
      best = date
      bestDistance = distance
    }
  }
  return best
}

function completeDate(partial: PartialDate, today: string): string | null {
  if (!partial.month) return null
  if (partial.year !== undefined) {
    return dateIn(partial.year, partial.month, partial.day)
  }
  return closestTo(today, partial.month, partial.day)
}

function parseDate(text: string, today: string): string | null {
  const partial = parsePartial(text, false)
  return partial ? completeDate(partial, today) : null
}

/** The start borrows what it leaves out from the end: "1 and 14 mar". */
function parseRange(
  from: string,
  to: string,
  today: string
): { start: string; end: string } | null {
  const endPartial = parsePartial(to, false)
  const startPartial = parsePartial(from, true)
  if (!endPartial || !startPartial) return null
  const end = completeDate(endPartial, today)
  if (!end) return null
  const { year, month } = plainDateParts(end)
  const ownMonth = startPartial.month !== undefined
  let start = dateIn(
    startPartial.year ?? year,
    startPartial.month ?? month,
    startPartial.day
  )
  if (!start) return null
  // "20 dec and 5 jan" crosses a new year; "14 and 1 mar" is just backwards.
  if (
    compareDates(start, end) > 0 &&
    ownMonth &&
    startPartial.year === undefined
  ) {
    start = dateIn(year - 1, startPartial.month!, startPartial.day)
  }
  if (!start || compareDates(start, end) > 0) return null
  return { start, end }
}

function parseTime(text: string): string | null {
  if (text === 'noon') return '12:00'
  if (text === 'midnight') return '00:00'
  let m = /^(\d{1,2})(?:[:.](\d{2}))? ?(am|pm)$/.exec(text)
  if (m) {
    const hour = Number(m[1])
    const minute = Number(m[2] ?? 0)
    if (hour < 1 || hour > 12 || minute > 59) return null
    const h24 = (hour % 12) + (m[3] === 'pm' ? 12 : 0)
    return `${pad(h24)}:${pad(minute)}`
  }
  m = /^(\d{1,2}):(\d{2})$/.exec(text)
  if (m) {
    const hour = Number(m[1])
    const minute = Number(m[2])
    if (hour > 23 || minute > 59) return null
    return `${pad(hour)}:${pad(minute)}`
  }
  return null
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function weekdayDates(
  modifier: string | undefined,
  weekday: number,
  today: string,
  weekStart: number
): string[] {
  const ahead = (weekday - dayOfWeek(today) + 7) % 7
  if (modifier === 'last') return [addDays(today, ahead - 7 || -7)]
  if (modifier !== 'next') return [addDays(today, ahead)]
  const nextWeek = addDays(startOfWeek(today, weekStart), 7)
  const inNextWeek = addDays(nextWeek, (weekday - weekStart + 7) % 7)
  const comingAfterToday = addDays(today, ahead || 7)
  return inNextWeek === comingAfterToday
    ? [inNextWeek]
    : [inNextWeek, comingAfterToday]
}

function rolling(
  direction: string,
  amount: number,
  unit: RollingRange['unit']
): RollingRange {
  return { direction: direction === 'next' ? 'next' : 'past', amount, unit }
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Suggestions for what a typed phrase means, best first. Empty when the text
 * is not a date phrase.
 */
export function parseDatePhrase(
  text: string,
  options: DatePhraseOptions
): DatePhraseSuggestion[] {
  const input = normalise(text).replace(/^on /, '')
  if (!input) return []
  const today = plainDateOf(options.now, options.timeZone)
  const weekStart = options.weekStart ?? 1

  const describe = (value: DateRangeValue): DatePhraseSuggestion => ({
    label:
      relativeLabel(value) ??
      formatResolved(
        resolveDateRange(value, options),
        options.timeZone,
        options.locale
      ),
    value
  })
  const formatDay = (date: string) =>
    formatDateTime(plainDateInstant(date), {
      timeZone: 'UTC',
      dateStyle: 'long',
      locale: options.locale
    }) ?? date
  const on = (date: string): DatePhraseSuggestion => ({
    label: formatDay(date),
    value: { on: date }
  })

  const phrase = PHRASES.find(([words]) => words === input)
  if (phrase) return [describe(phrase[1])]
  const alias = ALIASES[input]
  if (alias) return [describe(alias)]

  if (input === 'last weekend' || input === 'next weekend') {
    const shift = input === 'next weekend' ? 7 : -7
    const thisWeekend = resolveDateRange('this-weekend', options)
    const start = addDays(thisWeekend.start as string, shift)
    const explicit = describe({ start, end: addDays(start, 1) })
    return input === 'next weekend'
      ? [explicit, describe('this-weekend')]
      : [explicit]
  }

  let m = /^(next|last|past) (\d+) ([a-z]+?)s?$/.exec(input)
  if (m && UNITS[m[3]!]) {
    const amount = Number(m[2])
    return amount < 1 ? [] : [describe(rolling(m[1]!, amount, UNITS[m[3]!]!))]
  }
  m = /^(next|last|past) hour$/.exec(input)
  if (m) return [describe(rolling(m[1]!, 1, 'hour'))]
  m = /^(next|last|past) (\d+)$/.exec(input)
  if (m) {
    const amount = Number(m[2])
    if (amount < 1) return []
    return UNIT_ORDER.map((unit) => describe(rolling(m![1]!, amount, unit)))
  }

  m = /^(?:(this|next|last) )?([a-z]+)$/.exec(input)
  const weekday = m ? nameIndex(WEEKDAYS, m[2]!) : null
  if (m && weekday) {
    return weekdayDates(m[1], weekday, today, weekStart).map(on)
  }

  const time = parseTime(input)
  if (time) {
    const [hour, minute] = time.split(':').map(Number) as [number, number]
    const label = formatTimeOfDay(
      new Date(Date.UTC(2000, 0, 1, hour, minute)),
      {
        timeZone: 'UTC',
        timeStyle: 'short',
        locale: options.locale
      }
    )
    return [{ label: label ?? time, value: { time } }]
  }

  m = /^(after|before) (.+)$/.exec(input)
  if (m) {
    const date = parseDate(m[2]!, today)
    if (!date) return []
    const word = m[1] === 'after' ? 'After' : 'Before'
    const value = m[1] === 'after' ? { after: date } : { before: date }
    return [{ label: `${word} ${formatDay(date)}`, value }]
  }

  // Split rather than match: a lazy pattern backtracks on many separators.
  const ends = input.replace(/^(?:between|from) /, '').split(/ (?:and|to) /)
  if (ends.length === 2) {
    const range = parseRange(ends[0]!, ends[1]!, today)
    if (range) return [describe(range)]
  }

  const date = parseDate(input, today)
  if (date) return [on(date)]

  if (input.length < 2) return []
  const seen = new Set<string>()
  return PHRASES.filter(([words]) => words.startsWith(input))
    .map(([, value]) => describe(value))
    .filter(({ label }) => !seen.has(label) && seen.add(label))
}
