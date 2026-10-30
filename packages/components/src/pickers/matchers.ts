import { compareDates, dayOfWeek } from '@oztix/roadie-core/datetime'

/**
 * Picks out days by plain ISO date: one date, a range (both ends included),
 * every day before or after a date (that date left out), days of the week
 * (1 is Monday, 7 is Sunday) or a test of your own.
 */
export type CalendarMatcher =
  | string
  | { start: string; end: string }
  | { before: string }
  | { after: string }
  | { dayOfWeek: readonly number[] }
  | ((date: string) => boolean)

/** One matcher, or a list that matches when any of them does. */
export type CalendarMatchers = CalendarMatcher | readonly CalendarMatcher[]

function matchesOne(date: string, matcher: CalendarMatcher): boolean {
  if (typeof matcher === 'string') return matcher === date
  if (typeof matcher === 'function') return matcher(date)
  if ('dayOfWeek' in matcher) return matcher.dayOfWeek.includes(dayOfWeek(date))
  if ('before' in matcher) return compareDates(date, matcher.before) < 0
  if ('after' in matcher) return compareDates(date, matcher.after) > 0
  const [first, last] =
    compareDates(matcher.start, matcher.end) <= 0
      ? [matcher.start, matcher.end]
      : [matcher.end, matcher.start]
  return compareDates(date, first) >= 0 && compareDates(date, last) <= 0
}

export function matchesDate(
  date: string,
  matchers: CalendarMatchers | undefined
): boolean {
  if (matchers === undefined) return false
  if (Array.isArray(matchers))
    return matchers.some((matcher: CalendarMatcher) =>
      matchesOne(date, matcher)
    )
  return matchesOne(date, matchers as CalendarMatcher)
}

export function modifierAttribute(name: string): string {
  return `data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}
