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
  const date = parseDatePhrase(text, phraseOptions)
    .map(({ value }) => singleDate(value, phraseOptions))
    .find((found): found is string => found !== null)
  if (!date) return { error: TYPE_A_DATE }
  if (matchesDate(date, options.disabled)) {
    return {
      error: `${formatDate(date, { locale: options.locale })} isn’t available`
    }
  }
  return { value: date }
}
