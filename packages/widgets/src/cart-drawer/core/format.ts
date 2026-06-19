export type CurrencyOptions = {
  locale: string
  currency: string
}
export type DateOptions = {
  locale: string
}

export function formatCurrency(amount: number, opts: CurrencyOptions): string {
  return amount.toLocaleString(opts.locale, {
    style: 'currency',
    currency: opts.currency
  })
}

/**
 * Derive the locale/currency-specific symbol (e.g. "$", "NZ$", "€") so an
 * animated total can roll digits behind a correct prefix — never a hardcoded
 * "$" (design finding #1). Framework-agnostic so both skins share it.
 */
export function currencyPrefix(locale: string, currency: string): string {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).formatToParts(0)
  let prefix = ''
  for (const part of parts) {
    if (part.type === 'integer' || part.type === 'decimal') break
    if (part.type === 'currency' || part.type === 'literal')
      prefix += part.value
  }
  return prefix
}

/**
 * Wall-clock time of a Date as `7pm` / `7:30pm` (local time, lowercase am/pm,
 * no leading zero on the hour). Shared by both skins' event rows.
 */
export function formatTime(date: Date): string {
  const minutes = date.getMinutes()
  const hour = date.getHours()
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  if (minutes === 0) return `${h}${ampm}`
  return `${h}:${String(minutes).padStart(2, '0')}${ampm}`
}

// Parse a venue-local YYYY-MM-DD key to a local Date, or null if malformed /
// out-of-range (so callers can fail safe to the raw key).
function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const y = Number(dateKey.slice(0, 4))
  const m = Number(dateKey.slice(5, 7))
  const d = Number(dateKey.slice(8, 10))
  const date = new Date(y, m - 1, d) // local; no UTC shift
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null
  }
  return date
}

/** Format a venue-local YYYY-MM-DD key as a day header (parsed as local date). */
export function formatDayHeader(dateKey: string, opts: DateOptions): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey // fail-safe: malformed key
  return new Intl.DateTimeFormat(opts.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

/** Short day form like `Sun 4 Oct` (no year) for inline end dates. The locale
 * comma after the weekday is dropped so it composes cleanly inside a schedule. */
export function formatDayShort(dateKey: string, opts: DateOptions): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return new Intl.DateTimeFormat(opts.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
    .format(date)
    .replace(/,/g, '')
}

type Schedulable = {
  eventStartAtUtc: string
  eventEndAtUtc?: string
  eventDateKey: string
  eventEndDateKey?: string
}

/**
 * Build the event time row: `7pm` (no finish), `7pm – 11pm` (same-day finish),
 * or `6:30pm – Sun 4 Oct, 9pm` (multi-day — start time then end date + time).
 * Returns null when the start time is unparseable.
 */
export function formatEventSchedule(
  event: Schedulable,
  opts: DateOptions
): string | null {
  const start = new Date(event.eventStartAtUtc)
  if (Number.isNaN(start.getTime())) return null
  const startTime = formatTime(start)

  const end = event.eventEndAtUtc ? new Date(event.eventEndAtUtc) : null
  if (!end || Number.isNaN(end.getTime())) return startTime
  const endTime = formatTime(end)

  const multiDay =
    !!event.eventEndDateKey && event.eventEndDateKey !== event.eventDateKey
  if (multiDay) {
    return `${startTime} – ${formatDayShort(event.eventEndDateKey!, opts)}, ${endTime}`
  }
  return `${startTime} – ${endTime}`
}
