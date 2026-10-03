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
    formatDateTime(instantOf(date), { timeZone: 'UTC', dateStyle, locale }) ??
    date
  )
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

const ENGLISH = new Intl.Locale('en')
const nameCache = new Map<string, Map<string, string>>()

// 2 Mar 2026 was a Monday, so weekdays and months line up with these dates.
function localNames(locale: string): Map<string, string> {
  let names = nameCache.get(locale)
  if (names) return names
  names = new Map()
  const add = (options: Intl.DateTimeFormatOptions, dates: string[]) => {
    const local = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: 'UTC'
    })
    const english = new Intl.DateTimeFormat(ENGLISH, {
      ...options,
      timeZone: 'UTC'
    })
    for (const date of dates) {
      const key = local.format(instantOf(date)).toLowerCase().replace(/\.$/, '')
      names!.set(key, english.format(instantOf(date)).toLowerCase())
    }
  }
  const months = Array.from(
    { length: 12 },
    (_, i) => `2026-${String(i + 1).padStart(2, '0')}-15`
  )
  const weekdays = Array.from(
    { length: 7 },
    (_, i) => `2026-03-${String(2 + i).padStart(2, '0')}`
  )
  for (const style of ['long', 'short'] as const) {
    add({ month: style }, months)
    add({ weekday: style }, weekdays)
  }
  nameCache.set(locale, names)
  return names
}

// The parser reads English names, so a field shown in another locale has its
// month and day names put back into English before it is read.
function inEnglish(text: string, locale: string | undefined): string {
  if (!locale || new Intl.Locale(locale).language === 'en') return text
  const names = localNames(locale)
  return text
    .toLowerCase()
    .split(/(\s+|,)/)
    .map((word) => names.get(word.replace(/\.$/, '')) ?? word)
    .join('')
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
  const date = parseDatePhrase(inEnglish(text, options.locale), phraseOptions)
    .map(({ value }) => singleDate(value, phraseOptions))
    .find((found): found is string => found !== null)
  if (!date) return { error: TYPE_A_DATE }
  if (matchesDate(date, options.disabled)) {
    return {
      error: `${formatDate(date, options)} isn’t available`
    }
  }
  return { value: date }
}
