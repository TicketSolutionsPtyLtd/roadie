import {
  addDays,
  formatDateRange,
  formatFull
} from '@oztix/roadie-core/datetime'

// Noon UTC read in UTC, so a plain date names itself in every zone.
function instantOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

/** "Sunday, 14 March 2027" */
export function dayLabel(date: string, locale: string): string {
  return (
    formatFull(instantOf(date), { timeZone: 'UTC', locale, showYear: true }) ??
    date
  )
}

/** "Wednesday, 3 to Sunday, 7 March 2027" */
export function rangeLabel(start: string, end: string, locale: string): string {
  return (
    formatDateRange(instantOf(start), instantOf(end), {
      timeZone: 'UTC',
      locale,
      dateStyle: 'full'
    }) ?? `${start} to ${end}`
  )
}

// A calendar formats the same few patterns on every render.
const formatters = new Map<string, Intl.DateTimeFormat>()

function format(
  date: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
    formatters.set(key, formatter)
  }
  return formatter.format(instantOf(date))
}

/** "March 2027" */
export function monthLabel(month: string, locale: string): string {
  return format(month, locale, { month: 'long', year: 'numeric' })
}

export function monthNames(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    format(`2027-${String(i + 1).padStart(2, '0')}-01`, locale, {
      month: 'long'
    })
  )
}

// 1 January 2024 was a Monday.
export function weekdayNames(weekStart: number, locale: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays('2024-01-01', (weekStart - 1 + i) % 7)
    return {
      long: format(date, locale, { weekday: 'long' }),
      short: format(date, locale, { weekday: 'short' })
    }
  })
}
