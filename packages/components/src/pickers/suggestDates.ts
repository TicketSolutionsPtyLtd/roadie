import { compareDates } from '@oztix/roadie-core/datetime'

import { matchesDate } from '../components/Calendar/matchers'
import { type ReadDateOptions, formatDate, readDays, todayOf } from './readDate'

export type DateSuggestion = {
  key: string
  /** What to type for it, such as "Next Fri", or the date it names. */
  label: string
  /** The date a word stands for. */
  description?: string
  start: string
  /** The same as `start`: a suggestion is always one date. */
  end: string
}

export type SuggestDatesOptions = ReadDateOptions & {
  /** The earliest date to offer, such as a range's start for its end. */
  from?: string | null
  /** @default 6 */
  limit?: number
}

type Candidate = {
  phrase: string
  label?: string
  /** Finishes a date still being typed, so goes once the text names one. */
  unfinished?: boolean
}

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
  const nextMonth = (Number(today.slice(5, 7)) % 12) + 1
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
  const startsWith = (phrase: string) => phrase.startsWith(text)
  found.push(...WORDS.filter(startsWith).map(own))
  found.push(...ENDS.filter(startsWith).map(own))

  let m = /^(?:(next|this|last) )?([a-z]+)$/.exec(text)
  if (m) found.push(...weekdays(m[1], m[2]!))
  if (/^(next|this|last)$/.test(text)) found.push(...weekdays(text, ''))

  if ('in'.startsWith(text)) found.push(own('in 1 week'), own('in 2 weeks'))
  m = /^in (\d{1,4}|an?)(?: ([a-z]*))?$/.exec(text)
  if (m) {
    const count = m[1]!.startsWith('a') ? 'a' : m[1]!
    const one = count === '1' || count === 'a'
    for (const unit of UNITS) {
      if (!`${unit}s`.startsWith(m[2] ?? '')) continue
      found.push(own(`in ${count} ${one ? unit : `${unit}s`}`))
    }
  }

  m = /^(\d{1,2})(?:st|nd|rd|th)?(?: ([a-z]*))?$/.exec(text)
  if (m) {
    const day = Number(m[1])
    const [year, thisMonth, todayDay] = today.split('-').map(Number) as [
      number,
      number,
      number
    ]
    // The next twelve occurrences from today, each with its year, so a day
    // that has passed this month comes round again next year.
    const first = day < todayDay ? 1 : 0
    for (let step = first; step < first + 12; step++) {
      const index = thisMonth - 1 + step
      const month = index % 12
      if (!MONTH_NAMES[month]!.startsWith(m[2] ?? '')) continue
      const short = `${day} ${MONTHS[month]}`
      found.push({
        phrase: `${short} ${year + Math.floor(index / 12)}`,
        label: own(short).label,
        unfinished: true
      })
    }
  }
  return found
}

/**
 * Dates to offer for typed text: what it names first, then phrases it starts,
 * or with no text, hints at what can be typed. Each is resolved as the field
 * reads it, so taking one gives the date the description shows.
 */
export function suggestDates(
  text: string,
  { from, limit = 6, ...options }: SuggestDatesOptions
): DateSuggestion[] {
  const typed = text
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const today = todayOf(options)
  // Text that already names a date isn't finished another way: "1 oct" on
  // 7 Oct means 1 Oct, not next year's.
  const named = typed !== '' && readDays(text, options).length > 0
  const completed = typed
    ? completions(typed, today).filter((c) => !(named && c.unfinished))
    : []
  // A phrase of ours typed in full keeps its words, ahead of its dates.
  const isTyped = (candidate: Candidate) => candidate.phrase === typed
  const candidates: Candidate[] = typed
    ? [
        ...completed.filter(isTyped),
        { phrase: text },
        ...completed.filter((candidate) => !isTyped(candidate))
      ]
    : hints(today)
  const suggestions: DateSuggestion[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    // Our phrases are English, so a locale's own names mustn't read them.
    const readings = readDays(
      candidate.phrase,
      candidate.label && candidate.phrase !== typed
        ? { ...options, locale: undefined }
        : options
    )
    // A phrase of ours means the one date the field reads it as.
    const meant = candidate.label
      ? readings.filter((reading) => reading.start === reading.end).slice(0, 1)
      : readings
    for (const reading of meant) {
      // A range belongs to a range's presets, not to one of its ends.
      if (reading.start !== reading.end) continue
      const date = reading.start
      if (seen.has(date)) continue
      if (from && compareDates(date, from) < 0) continue
      if (matchesDate(date, options.disabled)) continue
      seen.add(date)
      const shown = formatDate(date, options)
      const named = candidate.label ?? (reading.relative ? reading.label : null)
      const suggestion = { key: date, start: date, end: date }
      suggestions.push(
        named
          ? { ...suggestion, label: named, description: shown }
          : { ...suggestion, label: shown }
      )
      if (suggestions.length === limit) return suggestions
    }
  }
  return suggestions
}
