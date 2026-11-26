import {
  addDays,
  addMonths,
  compareDates,
  plainDateParts
} from '@oztix/roadie-core/datetime'

// Lenient on purpose: a month prop such as '2026-11', read from a URL, still
// names its month rather than throwing during render.
export function monthOf(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function lastDayOf(month: string): string {
  return addDays(addMonths(month, 1), -1)
}

export function between(date: string, start: string, end: string) {
  return compareDates(date, start) >= 0 && compareDates(date, end) <= 0
}

export const yearOf = (date: string) => plainDateParts(monthOf(date)).year

export const monthNumberOf = (date: string) =>
  plainDateParts(monthOf(date)).month

export function monthsBetween(from: string, to: string): number {
  return (
    (yearOf(to) - yearOf(from)) * 12 + monthNumberOf(to) - monthNumberOf(from)
  )
}

export function weekTouches(start: string, month: string) {
  return monthOf(start) === month || monthOf(addDays(start, 6)) === month
}
