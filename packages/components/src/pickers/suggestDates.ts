import { addMonths, formatDateRange } from '@oztix/roadie-core/datetime'

import { matchesDate } from '../components/Calendar/matchers'
import { type ReadDateOptions, formatDate, readDays, todayOf } from './readDate'

export type DateSuggestion = {
  key: string
  /** What to type for it, such as "Next Fri", or the date it names. */
  label: string
  /** The dates a word stands for. */
  description?: string
  start: string
  /** The same as `start` for a single date. */
  end: string
}

export type SuggestDatesOptions = ReadDateOptions & {
  /** Offer ranges too, for the ends of a date range. */
  ranges?: boolean
  /** The fewest days a range may span. */
  minDays?: number
  /** The most days a range may span. */
  maxDays?: number
  /** @default 6 */
  limit?: number
}

type Candidate = { phrase: string; label?: string }

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const WEEKDAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]
const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sept',
  'oct',
  'nov',
  'dec'
]
const MONTH_NAMES = [
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
const WORDS = ['today', 'tomorrow', 'yesterday']
const ENDS = ['end of week', 'end of month', 'end of year']
const UNITS = ['day', 'week', 'month', 'year']

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)
const own = (phrase: string): Candidate => ({
  phrase,
  label: capitalise(
    phrase.replace(
      /\b(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sept|oct|nov|dec)\b/g,
      capitalise
    )
  )
})

function hints(today: string): Candidate[] {
  const nextMonth = Number(addMonths(today, 1).slice(5, 7))
  return [
    'today',
    'tomorrow',
    'next fri',
    'in 2 weeks',
    'end of month',
    `1 ${MONTHS[nextMonth - 1]}`
  ].map(own)
}

function weekdays(modifier: string | undefined, word: string): Candidate[] {
  return WEEKDAYS.filter((_, i) => WEEKDAY_NAMES[i]!.startsWith(word)).flatMap(
    (day) =>
      modifier ? [own(`${modifier} ${day}`)] : [own(day), own(`next ${day}`)]
  )
}

/** Phrases the text is the start of, so there's something to take as it's typed. */
function completions(text: string, today: string): Candidate[] {
  const found: Candidate[] = []
  const startsWith = (phrase: string) =>
    phrase !== text && phrase.startsWith(text)
  found.push(...WORDS.filter(startsWith).map(own))
  found.push(...ENDS.filter(startsWith).map(own))

  let m = /^(?:(next|this|last) )?([a-z]+)$/.exec(text)
  if (m) found.push(...weekdays(m[1], m[2]!))
  if (/^(next|this|last)$/.test(text)) found.push(...weekdays(text, ''))

  if ('in'.startsWith(text)) found.push(own('in 1 week'), own('in 2 weeks'))
  m = /^in (\d{1,4}|an?)(?: ([a-z]*))?$/.exec(text)
  if (m) {
    const count = m[1]!
    const one = count === '1' || count === 'a' || count === 'an'
    for (const unit of UNITS) {
      if (!unit.startsWith(m[2] ?? '')) continue
      found.push(own(`in ${count} ${one ? unit : `${unit}s`}`))
    }
  }

  m = /^(\d{1,2})(?:st|nd|rd|th)?(?: ([a-z]*))?$/.exec(text)
  if (m) {
    const thisMonth = Number(today.slice(5, 7)) - 1
    for (let step = 0; step < 12; step++) {
      const month = (thisMonth + step) % 12
      if (!MONTH_NAMES[month]!.startsWith(m[2] ?? '')) continue
      found.push(own(`${Number(m[1])} ${MONTHS[month]}`))
    }
  }
  return found
}

const DAY = 24 * 60 * 60 * 1000

function spanDays(start: string, end: string): number {
  return (Date.parse(end) - Date.parse(start)) / DAY + 1
}

/**
 * Dates to offer for typed text: what it names first, then phrases it starts,
 * or with no text, hints at what can be typed. Each is resolved as the field
 * reads it, so taking one gives the date the description shows.
 */
export function suggestDates(
  text: string,
  {
    ranges = false,
    minDays,
    maxDays,
    limit = 6,
    ...options
  }: SuggestDatesOptions
): DateSuggestion[] {
  const typed = text
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const today = todayOf(options)
  const candidates: Candidate[] = typed
    ? [{ phrase: text }, ...completions(typed, today)]
    : hints(today)
  const suggestions: DateSuggestion[] = []
  const seen = new Set<string>()
  const describe = (start: string, end: string) =>
    start === end
      ? formatDate(start, options)
      : (formatDateRange(
          new Date(`${start}T12:00:00Z`),
          new Date(`${end}T12:00:00Z`),
          { timeZone: 'UTC', dateStyle: 'medium', locale: options.locale }
        ) ?? `${start} to ${end}`)

  for (const candidate of candidates) {
    const readings = readDays(candidate.phrase, options)
    // A phrase of ours means the one date the field reads it as.
    const meant = candidate.label
      ? readings.filter((reading) => reading.start === reading.end).slice(0, 1)
      : readings
    for (const reading of meant) {
      const { start, end } = reading
      const single = start === end
      const key = single ? start : `${start}/${end}`
      if (seen.has(key)) continue
      if (!single) {
        const span = spanDays(start, end)
        if (!ranges) continue
        if (minDays !== undefined && span < minDays) continue
        if (maxDays !== undefined && span > maxDays) continue
      }
      if (
        matchesDate(start, options.disabled) ||
        matchesDate(end, options.disabled)
      )
        continue
      seen.add(key)
      const dates = describe(start, end)
      const named = candidate.label ?? (reading.relative ? reading.label : null)
      suggestions.push(
        named
          ? { key, label: named, description: dates, start, end }
          : { key, label: dates, start, end }
      )
      if (suggestions.length === limit) return suggestions
    }
  }
  return suggestions
}
