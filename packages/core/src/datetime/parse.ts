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
import {
  DEFAULT_LOCALE,
  dateTimeFormat,
  formatDateTime,
  formatTimeOfDay
} from './format'
import {
  addDays,
  addMonths,
  compareDates,
  dayNumber,
  dayOfWeek,
  daysInMonth,
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

export type DatePhraseSuggestion = {
  label: string
  value: DatePhraseValue
  /** The words a label of dates stands for: "Next weekend". */
  description?: string
}

const PHRASES: [string, DateRangeValue][] = [
  ['today', 'today'],
  ['tomorrow', 'tomorrow'],
  ['yesterday', 'yesterday'],
  ['this week', 'this-week'],
  ['this weekend', 'this-weekend'],
  ['this month', 'this-month'],
  ['this quarter', 'this-quarter'],
  ['this year', 'this-year'],
  ['this financial year', { period: 'year', offset: 0, fiscal: true }],
  ['next week', 'next-week'],
  ['next month', 'next-month'],
  ['next quarter', 'next-quarter'],
  ['next year', 'next-year'],
  ['next financial year', { period: 'year', offset: 1, fiscal: true }],
  ['last week', 'last-week'],
  ['last month', 'last-month'],
  ['last quarter', 'last-quarter'],
  ['last year', 'last-year'],
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
  weekend: 'this-weekend',
  tonight: 'today',
  tmrw: 'tomorrow',
  tomorow: 'tomorrow',
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
  const full = Object.hasOwn(SHORT_FORMS, word) ? SHORT_FORMS[word]! : word
  const index = names.findIndex(
    (name) => name === full || name.slice(0, 3) === full
  )
  return index < 0 ? null : index + 1
}

function fullYear(text: string | undefined): number | undefined {
  if (text === undefined) return undefined
  return text.length === 2 ? 2000 + Number(text) : Number(text)
}

const DAY_MONTH =
  /^(\d{1,2})(?:st|nd|rd|th)? (?:of )?([a-z]+)(?: (\d{2}|\d{4}))?$/
const MONTH_DAY = /^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{2}|\d{4}))?$/
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
  if (year < 1 || year > 9999) return null
  const date = toPlainDate(year, month, day)
  return isPlainDate(date) ? date : null
}

function closestTo(today: string, month: number, day: number): string | null {
  const { year } = plainDateParts(today)
  let best: string | null = null
  let bestDistance = Infinity
  // Leap years can be eight apart (2096 to 2104), so 29 Feb looks that far.
  for (let candidate = year - 8; candidate <= year + 8; candidate++) {
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

// The formatters lead with the weekday, so a shown date reads back as typed.
function withoutWeekday(text: string): string {
  const m = /^([a-z]+) (.+)$/.exec(text)
  return m && nameIndex(WEEKDAYS, m[1]!) ? m[2]! : text
}

function parseDate(text: string, today: string): string | null {
  const partial = parsePartial(withoutWeekday(text), false)
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

const MONTHS_IN: Record<string, number> = { month: 1, mth: 1, year: 12, yr: 12 }
const DAYS_IN: Record<string, number> = { day: 1, week: 7, wk: 7 }

/** "in 2 weeks": the day that far from today, or null past year 9999. */
function dateAhead(today: string, count: string, unit: string): string | null {
  const amount = count === 'a' || count === 'an' ? 1 : Number(count)
  if (amount < 1) return null
  try {
    if (Object.hasOwn(DAYS_IN, unit))
      return addDays(today, amount * DAYS_IN[unit]!)
    if (Object.hasOwn(MONTHS_IN, unit))
      return addMonths(today, amount * MONTHS_IN[unit]!)
  } catch {
    return null
  }
  return null
}

/** The last day of this week, month or year, or null past year 9999. */
function endOf(
  period: string,
  today: string,
  weekStart: number
): string | null {
  if (period === 'week') {
    const start = startOfWeek(today, weekStart)
    try {
      return addDays(start, 6)
    } catch {
      return null
    }
  }
  const { year, month } = plainDateParts(today)
  if (period === 'year') return toPlainDate(year, 12, 31)
  return toPlainDate(year, month, daysInMonth(year, month))
}

function rolling(
  direction: string,
  amount: number,
  unit: RollingRange['unit']
): RollingRange {
  return { direction: direction === 'next' ? 'next' : 'past', amount, unit }
}

// Words that change nothing before a phrase, as in "on the weekend",
// "the 20th of oct" and "in the next 7 days".
const LEADING =
  /^(?:(?:on|at|over) )?the (?=\d|weekend$)|^(?:in )?the (?=(?:next|last|past) )|^on (?!or )/

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
  const input = normalise(text).replace(LEADING, '')
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
  // The locale names and orders the month and year; the year stays in Latin
  // digits, as in every other label.
  const monthLabel = (first: string) =>
    dateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
      timeZone: 'UTC',
      calendar: 'gregory',
      year: 'numeric',
      month: 'long'
    })
      .formatToParts(plainDateInstant(first))
      .map((part) =>
        part.type === 'year' ? String(plainDateParts(first).year) : part.value
      )
      .join('')
  const on = (date: string): DatePhraseSuggestion => ({
    label: formatDay(date),
    value: { on: date }
  })

  const phrase = PHRASES.find(([words]) => words === input)
  if (phrase) return [describe(phrase[1])]
  const alias = Object.hasOwn(ALIASES, input) ? ALIASES[input] : undefined
  if (alias) return [describe(alias)]

  if (input === 'last weekend' || input === 'next weekend') {
    const shift = input === 'next weekend' ? 7 : -7
    const thisWeekend = resolveDateRange('this-weekend', options)
    const start = addDays(thisWeekend.start as string, shift)
    const explicit = {
      ...describe({ start, end: addDays(start, 1) }),
      description: `${input[0]!.toUpperCase()}${input.slice(1)}`
    }
    return input === 'next weekend'
      ? [explicit, describe('this-weekend')]
      : [explicit]
  }

  // Four digits is far beyond any real window and keeps dates in range.
  let m = /^(next|last|past) (\d{1,4}) ([a-z]+?)s?$/.exec(input)
  if (m && Object.hasOwn(UNITS, m[3]!)) {
    const amount = Number(m[2])
    return amount < 1 ? [] : [describe(rolling(m[1]!, amount, UNITS[m[3]!]!))]
  }
  m = /^(next|last|past) hour$/.exec(input)
  if (m) return [describe(rolling(m[1]!, 1, 'hour'))]
  m = /^(next|last|past) (\d{1,4})$/.exec(input)
  if (m) {
    const amount = Number(m[2])
    if (amount < 1) return []
    return UNIT_ORDER.map((unit) => describe(rolling(m![1]!, amount, unit)))
  }

  m = /^in (a|an|\d{1,4}) ([a-z]+?)s?$/.exec(input)
  if (m) {
    const date = dateAhead(today, m[1]!, m[2]!)
    return date ? [on(date)] : []
  }
  m = /^(end|rest) of (?:the |this )?(week|month|year)$/.exec(input)
  if (m) {
    const end = endOf(m[2]!, today, weekStart)
    if (!end) return []
    return [m[1] === 'end' ? on(end) : describe({ start: today, end })]
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

  const compare = (
    comparison: Comparison,
    text: string,
    lookBack: boolean
  ): DatePhraseSuggestion[] => {
    // One level only, so a run of comparison words stays linear.
    if (COMPARED.test(text)) return []
    const { after, edge, shift } = COMPARISONS[comparison]
    // "since mon" looks back to the last Monday, today included.
    const weekday = lookBack && nameIndex(WEEKDAYS, text)
    const days = weekday
      ? [on(addDays(today, -((dayOfWeek(today) - weekday + 7) % 7)))]
      : parseDatePhrase(text, options)
    return days.flatMap((day) => {
      const days = dayBounds(day.value, options)
      if (!days) return []
      const date = dayAway(days[edge], shift)
      if (!date) return []
      const suggestion: DatePhraseSuggestion = {
        label: `${after ? 'After' : 'Before'} ${formatDay(date)}`,
        value: after ? { after: date } : { before: date }
      }
      if (isDatePhraseCompletion(day)) COMPLETIONS.add(suggestion)
      return [suggestion]
    })
  }

  // "20 oct onwards" reads as "since 20 oct", but "mon onwards" is the
  // coming Monday.
  m = ONWARDS.exec(input)
  if (m) return ONWARDS.test(m[1]!) ? [] : compare('since', m[1]!, false)

  const ranges = rangesOf(input, today, options)
  if (ranges) return ranges.map(describe)

  m = COMPARED.exec(input)
  if (m) return compare(m[1] as Comparison, m[2]!, m[1] === 'since')

  m = /^([a-z]+)(?: (\d{4}))?$/.exec(input)
  const month = m ? nameIndex(MONTHS, m[1]!) : null
  if (m && month) {
    return monthsNamed(month, m[2], today).map((first) => ({
      label: monthLabel(first),
      value: { start: first, end: monthEnd(first) }
    }))
  }

  const date = parseDate(input, today)
  if (date) return [on(date)]

  if (input.length < 2) return []
  const seen = new Set<string>()
  // A bare period, as "month", completes to this one before "Month to date".
  const completions = PHRASES.filter(
    ([words]) => words.startsWith(input) || words.startsWith(`this ${input}`)
  )
    .map(([, value]) => describe(value))
    .filter(({ label }) => !seen.has(label) && seen.add(label))
  for (const suggestion of completions) COMPLETIONS.add(suggestion)
  return completions
}

const COMPLETIONS = new WeakSet<DatePhraseSuggestion>()

/**
 * The first day of each month a bare month name can mean: that month of a
 * given year, this month, or the closer of the coming and the last one, then
 * the other, as a date with no year takes the closest.
 */
function monthsNamed(
  month: number,
  yearText: string | undefined,
  today: string
): string[] {
  const { year } = plainDateParts(today)
  if (yearText) {
    const first = dateIn(Number(yearText), month, 1)
    return first ? [first] : []
  }
  const thisYear = toPlainDate(year, month, 1)
  const current = plainDateParts(today).month
  if (month === current) return [thisYear]
  const next = month > current ? thisYear : toPlainDate(year + 1, month, 1)
  const last = addMonths(next, -12)
  const ahead = (month - current + 12) % 12
  return ahead <= 6 ? [next, last] : [last, next]
}

function monthEnd(first: string): string {
  const { year, month } = plainDateParts(first)
  return toPlainDate(year, month, daysInMonth(year, month))
}

const ONWARDS = /^(.+) (?:onwards?|and later)$/

const DAY = '(\\d{1,2})(?:st|nd|rd|th)?'
const DASH = ' ?[-–] ?'
const YEAR = '((?: \\d{2}| \\d{4})?)'
const MONTH_DASHED = new RegExp(`^([a-z]+) ${DAY}${DASH}${DAY}${YEAR}$`)
const DASHED_MONTH = new RegExp(`^${DAY}${DASH}${DAY} ([a-z]+)${YEAR}$`)

/** "oct 22-24" and "22-24 oct" as "22 to 24 oct", or the text as it is. */
function undashed(input: string): string {
  let m = MONTH_DASHED.exec(input)
  if (m && nameIndex(MONTHS, m[1]!)) return `${m[2]} to ${m[3]} ${m[1]}${m[4]}`
  m = DASHED_MONTH.exec(input)
  if (m && nameIndex(MONTHS, m[3]!)) return `${m[1]} to ${m[2]} ${m[3]}${m[4]}`
  return input
}

/**
 * Each reading of "X to Y" as the days between, in order, or null unless
 * both ends read as days, as "tomorrow to next fri" does.
 */
function rangesOf(
  input: string,
  today: string,
  options: DatePhraseOptions
): { start: string; end: string }[] | null {
  // Split rather than match: a lazy pattern backtracks on many separators.
  const ends = undashed(input.replace(/^(?:between|from) /, '')).split(
    / (?:and|to) /
  )
  if (ends.length !== 2) return null
  const range = parseRange(ends[0]!, ends[1]!, today)
  if (range) return [range]
  const [firsts = [], lasts = []] = ends.map((end) =>
    parseDatePhrase(end, options).flatMap(
      (day) =>
        (!isDatePhraseCompletion(day) && dayBounds(day.value, options)) || []
    )
  )
  if (!firsts.length || !lasts.length) return null
  // "fri to mon" ends on the first Monday from Friday on.
  const weekday = nameIndex(WEEKDAYS, ends[1]!)
  return firsts.flatMap(({ start }) =>
    (weekday
      ? [{ end: addDays(start, (weekday - dayOfWeek(start) + 7) % 7) }]
      : lasts
    ).flatMap(({ end }) =>
      compareDates(start, end) > 0 ? [] : [{ start, end }]
    )
  )
}

/** Whether text is two days joined as a range, in either order, as "since tomorrow and fri". */
export function isDateRange(text: string, options: DatePhraseOptions): boolean {
  const input = normalise(text).replace(/^since /, '')
  return (
    rangesOf(input, plainDateOf(options.now, options.timeZone), options) !==
    null
  )
}

// "Since" and "from" take the day itself, as "until" and "till" do.
const ONWARD = { after: true, edge: 'start', shift: -1 } as const
const THROUGH = { after: false, edge: 'end', shift: 1 } as const
const COMPARISONS = {
  after: { after: true, edge: 'end', shift: 0 },
  before: { after: false, edge: 'start', shift: 0 },
  since: ONWARD,
  from: ONWARD,
  'on or after': ONWARD,
  until: THROUGH,
  till: THROUGH,
  'on or before': THROUGH
} as const
type Comparison = keyof typeof COMPARISONS

/** Words that compare with the date after them, as "after" in "after today". */
export const DATE_COMPARISONS: ReadonlySet<string> = new Set(
  Object.keys(COMPARISONS)
)
const COMPARED = new RegExp(`^(${[...DATE_COMPARISONS].join('|')}) (.+)$`)

/** The day `shift` days from `date`, or null past the years a date holds. */
function dayAway(date: string, shift: number): string | null {
  try {
    return addDays(date, shift)
  } catch {
    return null
  }
}

/** The first and last day a phrase covers, or null for a time or an open range. */
function dayBounds(
  value: DatePhraseValue,
  options: DatePhraseOptions
): { start: string; end: string } | null {
  if (typeof value === 'object' && 'on' in value)
    return { start: value.on, end: value.on }
  if (
    typeof value === 'object' &&
    ('before' in value || 'after' in value || 'time' in value)
  )
    return null
  const range = resolveDateRange(value, options)
  return range.kind === 'dates' ? range : null
}

/** Whether a suggestion finishes a phrase from its first letters, like "ongo". */
export function isDatePhraseCompletion(
  suggestion: DatePhraseSuggestion
): boolean {
  return COMPLETIONS.has(suggestion)
}
