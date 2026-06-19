import type { CartSeat } from './types'

export type CurrencyOptions = {
  locale: string
  currency: string
}
export type DateOptions = {
  locale: string
}

// Collapse a row's seat numbers into runs ("11","12","15" -> "11–12, 15").
// Non-integer labels fall back to a comma list.
function collapseSeatRuns(labels: string[]): string {
  const allInts = labels.every((s) => /^\d+$/.test(s))
  if (!allInts) return labels.join(', ')
  const sorted = [...labels.map(Number)].sort((a, b) => a - b)
  const runs: string[] = []
  let start = sorted[0]!
  let prev = start
  const flush = () =>
    runs.push(start === prev ? `${start}` : `${start}–${prev}`)
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!
    if (cur === prev + 1) {
      prev = cur
    } else {
      flush()
      start = prev = cur
    }
  }
  flush()
  return runs.join(', ')
}

/**
 * Render a seat list as a human range — `Stalls B11–12`, `Booth 4`, or
 * `Stalls B11–12 · Mezzanine M3` across sections. Groups by section + row,
 * collapses consecutive seat numbers, and joins groups with a middle dot.
 * Returns null for empty/absent seats. Shared so every skin/consumer matches.
 */
export function formatSeatRange(seats: CartSeat[] | undefined): string | null {
  if (!seats || seats.length === 0) return null
  // De-dupe identical seats so a merged reservation (the same seat arriving
  // from two combined lines) never renders twice.
  const seen = new Set<string>()
  const groups = new Map<
    string,
    { section?: string; row?: string; labels: string[] }
  >()
  for (const s of seats) {
    const id = `${s.section ?? ''}|${s.row ?? ''}|${s.seat}`
    if (seen.has(id)) continue
    seen.add(id)
    const key = `${s.section ?? ''}|${s.row ?? ''}`
    const group = groups.get(key) ?? {
      section: s.section,
      row: s.row,
      labels: []
    }
    group.labels.push(s.seat)
    groups.set(key, group)
  }
  const parts = [...groups.values()].map((g) => {
    const seatList = `${g.row ?? ''}${collapseSeatRuns(g.labels)}`
    return g.section ? `${g.section} ${seatList}` : seatList
  })
  return parts.join(' · ')
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

export type TimeOptions = {
  /** Venue IANA timezone. When set, the time renders in venue-local rather than
   * browser-local time. Falls back to browser-local if the id is invalid. */
  timeZone?: string
}

// Wall-clock hour (0–23) + minute of an instant in a given IANA timezone, or
// null if `Intl` rejects the id (so callers fail safe to browser-local). 'en-US'
// only fixes the digit set we parse — the displayed style is reassembled below.
function wallClockInZone(
  date: Date,
  timeZone: string
): { hour: number; minute: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date)
    const hour = Number(parts.find((p) => p.type === 'hour')?.value)
    const minute = Number(parts.find((p) => p.type === 'minute')?.value)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null
    return { hour: hour % 24, minute } // 'hour12:false' can emit 24 at midnight
  } catch {
    return null // unknown/invalid timezone id
  }
}

/**
 * Wall-clock time of a Date as `7pm` / `7:30pm` (lowercase am/pm, no leading
 * zero on the hour). With `opts.timeZone` the time is the VENUE's local time;
 * without it (or on an invalid id) it's the viewer's browser-local time —
 * preserving the legacy behaviour. Shared by both skins' event rows.
 */
export function formatTime(date: Date, opts: TimeOptions = {}): string {
  let hour = date.getHours()
  let minutes = date.getMinutes()
  if (opts.timeZone) {
    const wc = wallClockInZone(date, opts.timeZone)
    if (wc) {
      hour = wc.hour
      minutes = wc.minute
    }
  }
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
  /** Venue IANA timezone — renders times venue-local. Optional; omit for the
   * legacy browser-local behaviour. */
  eventTimeZone?: string
}

/**
 * Build the event time row: `7pm` (no finish), `7pm – 11pm` (same-day finish),
 * or `6:30pm – Sun 4 Oct, 9pm` (multi-day — start time then end date + time).
 * Times render in the venue's timezone when `event.eventTimeZone` is set,
 * otherwise in the viewer's browser-local time. Returns null when the start
 * time is unparseable.
 */
export function formatEventSchedule(
  event: Schedulable,
  opts: DateOptions
): string | null {
  const timeOpts: TimeOptions = { timeZone: event.eventTimeZone }
  const start = new Date(event.eventStartAtUtc)
  if (Number.isNaN(start.getTime())) return null
  const startTime = formatTime(start, timeOpts)

  const end = event.eventEndAtUtc ? new Date(event.eventEndAtUtc) : null
  if (!end || Number.isNaN(end.getTime())) return startTime
  const endTime = formatTime(end, timeOpts)

  const multiDay =
    !!event.eventEndDateKey && event.eventEndDateKey !== event.eventDateKey
  if (multiDay) {
    return `${startTime} – ${formatDayShort(event.eventEndDateKey!, opts)}, ${endTime}`
  }
  return `${startTime} – ${endTime}`
}
