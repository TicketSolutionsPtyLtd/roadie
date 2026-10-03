import {
  type DatePhraseValue,
  type Instantish,
  formatDateTime,
  isAbsoluteRange,
  parseDatePhrase,
  resolveDateRange,
  viewerTimeZone
} from '@oztix/roadie-core/datetime'

import { type CalendarMatchers, matchesDate } from '../Calendar/matchers'

export type DateStyle = 'full' | 'long' | 'medium'

export type ReadDateOptions = {
  /** Today as an ISO date. Wins over `now` and `timeZone`. */
  today?: string
  now?: Instantish
  timeZone?: string
  weekStart?: number
  locale?: string
  disabled?: CalendarMatchers
  /** How a refused date is named in its error. */
  dateStyle?: DateStyle
}

export type ReadResult = { value: string | null } | { error: string }

const TYPE_A_DATE = 'Enter a date, like 14 Mar or next Fri'

// Noon UTC read in UTC, so a plain date names itself in every zone.
function instantOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

export function formatDate(
  date: string,
  { dateStyle = 'long', locale }: { dateStyle?: DateStyle; locale?: string }
): string {
  return (
    formatDateTime(instantOf(date), {
      timeZone: 'UTC',
      dateStyle,
      locale: gregorian(locale)
    }) ?? date
  )
}

// The day and year shown are Gregorian, so the month and weekday names must
// be too, whatever calendar the locale prefers.
function gregorian(locale: string | undefined): string | undefined {
  if (!locale) return locale
  try {
    return new Intl.Locale(locale, { calendar: 'gregory' }).toString()
  } catch {
    return locale
  }
}

function singleDate(
  value: DatePhraseValue,
  options: { now: Instantish; timeZone: string; weekStart?: number }
): string | null {
  if (typeof value === 'object' && 'on' in value) return value.on
  if (
    typeof value === 'object' &&
    ('time' in value || 'before' in value || 'after' in value)
  )
    return null
  if (isAbsoluteRange(value)) {
    return value.start === value.end ? value.start : null
  }
  const range = resolveDateRange(value, options)
  return range.kind === 'dates' && range.start === range.end
    ? range.start
    : null
}

type LocalNames = { weekdays: string[]; months: [RegExp, string][] }

const nameCache = new Map<string, LocalNames | null>()

function namePart(
  locale: string,
  options: Intl.DateTimeFormatOptions,
  date: string,
  type: 'month' | 'weekday'
): string {
  // Asked for as the datetime formatters ask, so the names match what shows,
  // and Gregorian, as the field's dates are, whatever the locale's calendar.
  const parts = new Intl.DateTimeFormat(locale, {
    ...options,
    calendar: 'gregory',
    timeZone: 'UTC'
  }).formatToParts(instantOf(date))
  return (parts.find((part) => part.type === type)?.value ?? '')
    .toLowerCase()
    .replace(/\.$/, '')
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function localNames(locale: string): LocalNames | null {
  if (nameCache.has(locale)) return nameCache.get(locale)!
  let names: LocalNames | null = null
  try {
    const months = new Map<string, string>()
    const weekdays = new Set<string>()
    for (const style of ['long', 'short'] as const) {
      for (let month = 1; month <= 12; month++) {
        const date = `2026-${String(month).padStart(2, '0')}-15`
        const name = namePart(
          locale,
          { weekday: style, month: style },
          date,
          'month'
        )
        // A numeric month would be read as the day beside it.
        if (name && !/^\p{Nd}+$/u.test(name))
          months.set(name, namePart('en', { month: 'long' }, date, 'month'))
      }
      // 2 Mar 2026 was a Monday.
      for (let day = 2; day <= 8; day++) {
        const name = namePart(
          locale,
          { weekday: style, month: style },
          `2026-03-0${day}`,
          'weekday'
        )
        if (name) weekdays.add(name)
      }
    }
    const longestFirst = (a: string, b: string) => b.length - a.length
    names = {
      weekdays: [...weekdays].sort(longestFirst),
      months: [...months.keys()]
        .sort(longestFirst)
        .map((name) => [
          new RegExp(`(^|\\s)${escape(name)}\\.?(?=\\s|$)`, 'u'),
          months.get(name)!
        ])
    }
  } catch {
    names = null
  }
  // Locales come from callers, so the oldest is dropped rather than grow.
  if (nameCache.size >= 16) nameCache.delete(nameCache.keys().next().value!)
  nameCache.set(locale, names)
  return names
}

/**
 * The parser reads English, so a date shown in another locale has its
 * leading weekday dropped and its month put into English. Weekdays are only
 * taken from the start, so a month that shares a short name with a weekday
 * ("mar" in Spanish) stays a month.
 */
function inEnglish(text: string, locale: string): string | null {
  const names = localNames(locale)
  if (!names) return null
  let local = text.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  const weekday = names.weekdays.find(
    (name) => local.startsWith(`${name} `) || local.startsWith(`${name}. `)
  )
  if (weekday) local = local.slice(weekday.length).replace(/^\.? /, '')
  for (const [name, english] of names.months) {
    if (name.test(local)) return local.replace(name, `$1${english}`)
  }
  return null
}

/** The one date typed text names, or why it names none. */
export function readDate(text: string, options: ReadDateOptions): ReadResult {
  if (!text.trim()) return { value: null }
  const context = options.today
    ? { now: instantOf(options.today), timeZone: 'UTC' }
    : {
        now: options.now ?? new Date(),
        timeZone: options.timeZone ?? viewerTimeZone()
      }
  const phraseOptions = {
    ...context,
    weekStart: options.weekStart,
    locale: options.locale
  }
  const dateIn = (phrase: string) =>
    parseDatePhrase(phrase, phraseOptions)
      .map(({ value }) => singleDate(value, phraseOptions))
      .find((found): found is string => found !== null)
  const local = options.locale ? inEnglish(text, options.locale) : null
  // The local reading first: some local abbreviations are English months
  // ("Jan" is June in Sesotho). English typing has no local month, so falls
  // through to the raw text.
  const date = (local ? dateIn(local) : undefined) ?? dateIn(text)
  if (!date) return { error: TYPE_A_DATE }
  if (matchesDate(date, options.disabled)) {
    return {
      error: `${formatDate(date, options)} isn’t available`
    }
  }
  return { value: date }
}
