/**
 * Roadie's date and time vocabulary. See /foundations/date-and-time.
 *
 * `dateStyle` and `timeStyle` are orthogonal and either may be omitted, as in
 * `Intl.DateTimeFormat`. Strings are assembled from Intl parts rather than a
 * locale pattern: the locale supplies the words, the rules supply the shape.
 */

export type DateContext = 'standalone' | 'list'

/**
 * How much of the date is spelled out. Each step drops one thing.
 *
 * - `full`   Friday, 27 November 2026
 * - `long`   Fri 27 Nov 2026 — the default
 * - `medium` 27 Nov 2026 — drops the weekday
 * - `short`  27 Nov — never carries a year
 * - `iso`    2026-11-27 — exports and filenames, never shown to a customer
 */
export type DateStyle = 'full' | 'long' | 'medium' | 'short' | 'iso'

/**
 * The same ladder as `DateStyle`. Omit for no time at all.
 *
 * - `long`    7:30pm AEDT — the reader may be in another zone
 * - `medium`  7:30pm — the default, drops the zone
 * - `short`   7:30pm, 7pm — drops the zero minutes
 * - `numeric` 19:30 — data contexts only, never prose
 */
export type TimeStyle = 'long' | 'medium' | 'short' | 'numeric'

/**
 * An instant, however the caller holds one.
 *
 * Temporal.ZonedDateTime and Temporal.Instant both expose `epochMilliseconds`,
 * so a Temporal value works here today without this package depending on
 * Temporal or shipping a polyfill. When Temporal is baseline we can move the
 * internals onto PlainDate/ZonedDateTime without breaking a single call site.
 */
export type Instantish = Date | { epochMilliseconds: number }

/**
 * The zone the reader is sitting in. For a timestamp only: an event time
 * belongs to its venue, so pass the venue's zone instead.
 */
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export type FormatOptions = {
  /**
   * IANA zone of the venue, e.g. 'Australia/Brisbane'. Required: an event date
   * rendered in the viewer's zone is wrong for anyone who is not standing at
   * the venue, and the failure is silent.
   */
  timeZone: string
  locale?: string
  dateStyle?: DateStyle
  /** Omit for a date with no time. */
  timeStyle?: TimeStyle
  /** Injected so the year rule is testable without mocking the clock. */
  now?: Instantish
  /**
   * Whether the date stands alone or sits among siblings that may span years.
   * Defaults to 'list': a forgotten context yields a verbose date, never an
   * ambiguous one.
   */
  context?: DateContext
  /**
   * Overrides the year rule outright, for surfaces whose year is fixed by
   * something other than the page: a cart grouped by day key, a tile. Not a
   * way around the rule.
   */
  showYear?: boolean
}

const DEFAULT_LOCALE = 'en-AU'
const DEFAULT_DATE_STYLE: DateStyle = 'long'

/**
 * A word, not a dash. Screen readers announce an en dash inconsistently and
 * often not at all, so 'Fri 27 – Sun 29 Nov' can be heard as one run-on date.
 * 'to' is also how anyone would say a range out loud.
 */
const RANGE = 'to'
const MIDDOT = '·'
/** Intl joins a date and a time with a comma; so do we. */
const DATE_TIME_SEPARATOR = ', '

/** An end at or before this hour belongs to the previous night's programme. */
const END_OF_NIGHT_HOUR = 6

/** Past this, a day count stops being information. */
const MAX_DURATION_DAYS = 30

type Parts = {
  weekdayLong: string
  weekdayShort: string
  day: number
  monthLong: string
  monthShort: string
  monthNumber: number
  year: number
  hour: number
  minute: number
}

function toDate(value: Instantish): Date {
  return value instanceof Date ? value : new Date(value.epochMilliseconds)
}

function pick(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? ''
}

// Some locales abbreviate with a trailing period ('Nov.'); the vocabulary does not.
function trimAbbreviation(value: string): string {
  return value.replace(/\.$/, '')
}

function zoneParts(
  value: Instantish,
  timeZone: string,
  locale: string
): Parts | null {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return null
  try {
    const long = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: 'long',
      month: 'long'
    }).formatToParts(date)

    const short = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: 'short',
      month: 'short'
    }).formatToParts(date)

    // Latin digits. Reading numbers from the localised pass yields '٢٧' under
    // ar-EG, which Number() turns into NaN.
    const numeric = new Intl.DateTimeFormat('en-US', {
      timeZone,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date)

    const day = Number(pick(numeric, 'day'))
    const year = Number(pick(numeric, 'year'))
    const monthNumber = Number(pick(numeric, 'month'))
    const minute = Number(pick(numeric, 'minute'))
    // 'hour12: false' can emit 24 at midnight.
    const hour = Number(pick(numeric, 'hour')) % 24

    if ([day, year, monthNumber, minute, hour].some((n) => Number.isNaN(n))) {
      return null
    }

    return {
      weekdayLong: pick(long, 'weekday'),
      weekdayShort: trimAbbreviation(pick(short, 'weekday')),
      day,
      monthLong: pick(long, 'month'),
      monthShort: trimAbbreviation(pick(short, 'month')),
      monthNumber,
      year,
      hour,
      minute
    }
  } catch {
    return null
  }
}

function resolve(opts: FormatOptions) {
  return {
    timeZone: opts.timeZone,
    locale: opts.locale ?? DEFAULT_LOCALE,
    dateStyle: opts.dateStyle ?? DEFAULT_DATE_STYLE,
    timeStyle: opts.timeStyle,
    now: opts.now ?? new Date(),
    context: opts.context ?? 'list'
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * The year is a disambiguator: show it unless something already on screen
 * establishes it. Measured in the venue's zone, so two staff in different
 * states agree about a New Year's Eve event.
 *
 * `short` never carries a year and `iso` always does: those are properties of
 * the style, so context does not apply to them.
 */
function wantsYear(parts: Parts, opts: FormatOptions): boolean {
  const { dateStyle, timeZone, locale, now, context } = resolve(opts)
  if (dateStyle === 'short') return false
  if (dateStyle === 'iso') return true
  if (opts.showYear !== undefined) return opts.showYear
  if (context !== 'standalone') return true
  const nowParts = zoneParts(now, timeZone, locale)
  if (!nowParts) return true
  return parts.year !== nowParts.year
}

function datePart(parts: Parts, style: DateStyle, withYear: boolean): string {
  if (style === 'iso') {
    return `${parts.year}-${pad(parts.monthNumber)}-${pad(parts.day)}`
  }
  const year = withYear ? ` ${parts.year}` : ''
  if (style === 'full') {
    return `${parts.weekdayLong}, ${parts.day} ${parts.monthLong}${year}`
  }
  if (style === 'long') {
    return `${parts.weekdayShort} ${parts.day} ${parts.monthShort}${year}`
  }
  // medium and short differ only by the year.
  return `${parts.day} ${parts.monthShort}${year}`
}

function timePart(
  parts: Parts,
  style: TimeStyle | undefined,
  zone?: string | null
): string | null {
  if (!style) return null
  // Zero-padded so a column aligns and sorts lexicographically.
  if (style === 'numeric') return `${pad(parts.hour)}:${pad(parts.minute)}`
  const meridiem = parts.hour >= 12 ? 'pm' : 'am'
  const h = parts.hour % 12 === 0 ? 12 : parts.hour % 12
  // No space before the meridiem, at every style. The platform spaces it.
  if (style === 'short' && parts.minute === 0) return `${h}${meridiem}`
  const time = `${h}:${pad(parts.minute)}${meridiem}`
  return style === 'long' && zone ? `${time} ${zone}` : time
}

/**
 * The UTC offset for a zone at a given instant, as '+10:00' or 'Z'.
 * Returns null if the engine cannot resolve it.
 */
/**
 * The zone as people say it: AEDT, AEST, AWST. Correctly follows daylight
 * saving, so the same venue reads AEST in winter and AEDT in summer.
 */
function zoneAbbreviation(
  date: Date,
  timeZone: string,
  locale: string
): string | null {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: 'short'
    }).formatToParts(date)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? null
  } catch {
    return null
  }
}

function zoneOffset(date: Date, timeZone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset'
    }).formatToParts(date)
    const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    const match = name.match(/GMT([+-]\d{2}:\d{2})/)
    if (match) return match[1]!
    // 'GMT' with no offset is UTC itself.
    return name === 'GMT' ? 'Z' : null
  } catch {
    return null
  }
}

/**
 * The machine-readable value for a `<time datetime="…">` attribute.
 *
 * With no `timeStyle` this is a calendar date, which genuinely has no zone.
 * With one it is a *global* date and time, carrying the venue's offset, so it
 * identifies an instant. This is the difference between `iso` and this: `iso`
 * is for a spreadsheet cell and deliberately has no offset, which makes it
 * wrong for `datetime` because a reader cannot tell which 7:30pm it was.
 *
 * Seconds are always `00`, deliberately. The attribute is the machine-readable
 * equivalent of the text beside it, and the text never shows seconds, so a
 * truer value here would disagree with what the reader can see. Where the exact
 * instant matters more than the pairing, carry it separately.
 *
 * Prefer the DateTime component, which sets this for you.
 */
export function formatMachine(
  date: Instantish,
  opts: FormatOptions
): string | null {
  const { timeZone, locale, timeStyle } = resolve(opts)
  const parts = zoneParts(date, timeZone, locale)
  if (!parts) return null
  const day = `${parts.year}-${pad(parts.monthNumber)}-${pad(parts.day)}`
  if (!timeStyle) return day
  const offset = zoneOffset(toDate(date), timeZone)
  // A caller that asked for a time and got a bare date has been handed less
  // than it asked for, silently. Reachable where ICU lacks 'longOffset'.
  if (!offset) return null
  return `${day}T${pad(parts.hour)}:${pad(parts.minute)}:00${offset}`
}

/** The core. Every preset below is a thin call into this. */
/**
 * Append the time to an already-built date piece.
 *
 * Its own function because a range assembles each end by hand and has to join
 * them exactly the way a single moment does. Two copies of this is how a range
 * came to carry the time on one end and drop it from the other.
 */
function joinTime(
  datePiece: string,
  parts: Parts,
  date: Instantish,
  opts: ReturnType<typeof resolve>
): string {
  const { timeZone, locale, dateStyle, timeStyle } = opts
  if (!timeStyle) return datePiece
  // ISO stays machine-readable end to end: 24-hour, space-separated.
  if (dateStyle === 'iso') {
    return `${datePiece} ${pad(parts.hour)}:${pad(parts.minute)}`
  }
  const zone =
    timeStyle === 'long'
      ? zoneAbbreviation(toDate(date), timeZone, locale)
      : null
  // A comma in prose; a space for data columns, which are not sentences.
  const separator = timeStyle === 'numeric' ? ' ' : DATE_TIME_SEPARATOR
  return `${datePiece}${separator}${timePart(parts, timeStyle, zone)}`
}

export function formatDateTime(
  date: Instantish,
  opts: FormatOptions
): string | null {
  const resolved = resolve(opts)
  const parts = zoneParts(date, resolved.timeZone, resolved.locale)
  if (!parts) return null

  const datePiece = datePart(parts, resolved.dateStyle, wantsYear(parts, opts))
  return joinTime(datePiece, parts, date, resolved)
}

/** `full`: a single date with room around it. */
export function formatFull(
  date: Instantish,
  opts: Omit<FormatOptions, 'dateStyle'>
): string | null {
  return formatDateTime(date, { ...opts, dateStyle: 'full' } as FormatOptions)
}

/** `long`: the everyday default. */
export function formatLong(
  date: Instantish,
  opts: Omit<FormatOptions, 'dateStyle'>
): string | null {
  return formatDateTime(date, { ...opts, dateStyle: 'long' } as FormatOptions)
}

/** `medium`: where the day of week does not help the reader. */
export function formatMedium(
  date: Instantish,
  opts: Omit<FormatOptions, 'dateStyle'>
): string | null {
  return formatDateTime(date, { ...opts, dateStyle: 'medium' } as FormatOptions)
}

/** `short`: where context already supplies the year. */
export function formatShort(
  date: Instantish,
  opts: Omit<FormatOptions, 'dateStyle'>
): string | null {
  return formatDateTime(date, { ...opts, dateStyle: 'short' } as FormatOptions)
}

/** `iso`: exports, filenames, anything sorted or parsed. */
export function formatIso(
  date: Instantish,
  opts: Omit<FormatOptions, 'dateStyle'>
): string | null {
  return formatDateTime(date, { ...opts, dateStyle: 'iso' } as FormatOptions)
}

/**
 * The calendar tile: two rows, no year. Returns parts rather than a string
 * because the tile stacks them.
 */
export function formatGlyph(
  date: Instantish,
  opts: FormatOptions
): { month: string; day: string; weekday: string } | null {
  const { timeZone, locale } = resolve(opts)
  const parts = zoneParts(date, timeZone, locale)
  if (!parts) return null
  return {
    month: parts.monthShort.toLocaleUpperCase(locale),
    day: String(parts.day),
    weekday: parts.weekdayShort.toLocaleUpperCase(locale)
  }
}

export function formatTimeOfDay(
  date: Instantish,
  opts: FormatOptions
): string | null {
  const { timeZone, locale, timeStyle } = resolve(opts)
  const parts = zoneParts(date, timeZone, locale)
  if (!parts) return null
  const style = timeStyle ?? 'medium'
  const zone =
    style === 'long' ? zoneAbbreviation(toDate(date), timeZone, locale) : null
  return timePart(parts, style, zone)
}

/** The word 'to' joins the two ends of a range. */
export function formatTimeRange(
  start: Instantish,
  end: Instantish | null | undefined,
  opts: FormatOptions
): string | null {
  const startTime = formatTimeOfDay(start, opts)
  if (!startTime) return null
  if (!end) return startTime
  const endTime = formatTimeOfDay(end, opts)
  if (!endTime) return startTime
  return `${startTime} ${RANGE} ${endTime}`
}

/**
 * A date range. When both ends share a year the year rides the later date
 * only; a range that straddles a year boundary prints both. The month rides
 * the later date too when both ends share it.
 */
export type DateRangeParts = {
  from: string
  /** Null when both ends fall on the same day, so there is nothing to join. */
  to: string | null
}

/**
 * The two halves of a range, before they are joined.
 *
 * Exposed because the halves are not independent: the year, and sometimes the
 * month, ride on the later date. A caller that wants each end in its own `time`
 * element cannot compute them separately and get the same answer.
 */
export function formatDateRangeParts(
  start: Instantish,
  end: Instantish | null | undefined,
  opts: FormatOptions
): DateRangeParts | null {
  const resolved = resolve(opts)
  const { timeZone, locale, dateStyle, timeStyle } = resolved
  const startParts = zoneParts(start, timeZone, locale)
  if (!startParts) return null

  const whole = formatDateTime(start, opts)
  if (whole === null) return null
  if (!end) return { from: whole, to: null }

  const endParts = zoneParts(end, timeZone, locale)
  if (!endParts) return { from: whole, to: null }

  const sameDay =
    startParts.year === endParts.year &&
    startParts.monthNumber === endParts.monthNumber &&
    startParts.day === endParts.day

  const endText = formatDateTime(end, opts)

  // One day, but two different times, is a time range: say the date once and
  // let the end be a bare time. Without a `timeStyle` the two ends are the same
  // string, so there is genuinely nothing to join.
  if (sameDay) {
    if (!timeStyle) return { from: whole, to: null }
    if (dateStyle === 'iso') return { from: whole, to: endText }
    // Compare the two times, not the end against the whole date. '12:30pm' is
    // a suffix of 'Fri 27 Nov 2026, 12:30pm' by luck, and of '2:30pm' too.
    const endTime = formatTimeOfDay(end, opts)
    const startTime = formatTimeOfDay(start, opts)
    return { from: whole, to: endTime === startTime ? null : endTime }
  }

  // ISO ranges keep both ends whole so each side stays parseable.
  if (dateStyle === 'iso') return { from: whole, to: endText }

  if (startParts.year !== endParts.year) {
    // Both ends carry their year, whatever the context.
    return {
      from: joinTime(
        datePart(startParts, dateStyle, true),
        startParts,
        start,
        resolved
      ),
      to: joinTime(datePart(endParts, dateStyle, true), endParts, end, resolved)
    }
  }

  const sameMonth = startParts.monthNumber === endParts.monthNumber
  return {
    from: joinTime(
      sameMonth
        ? shedMonth(startParts, dateStyle)
        : datePart(startParts, dateStyle, false),
      startParts,
      start,
      resolved
    ),
    to: endText
  }
}

/** A date range as one string. Prefer `<DateTime to>` in React. */
export function formatDateRange(
  start: Instantish,
  end: Instantish | null | undefined,
  opts: FormatOptions
): string | null {
  const parts = formatDateRangeParts(start, end, opts)
  if (!parts) return null
  return parts.to === null ? parts.from : `${parts.from} ${RANGE} ${parts.to}`
}

/** The leading end of a same-month range: the month rides the later date. */
function shedMonth(parts: Parts, style: DateStyle): string {
  if (style === 'full') return `${parts.weekdayLong}, ${parts.day}`
  if (style === 'long') return `${parts.weekdayShort} ${parts.day}`
  return String(parts.day)
}

/**
 * Duration is a fact about a range, not a way of spelling it, so it stays
 * separate from the range formatters.
 *
 * An end at or before 6am rolls back a day: a 10pm-3am show is one night, not
 * two. A start already before the cutoff is left alone so midnight-to-midnight
 * is not collapsed. Returns null when a count would not inform.
 */
export function formatDurationDays(
  start: Instantish,
  end: Instantish | null | undefined,
  opts: FormatOptions
): string | null {
  if (!end) return null
  const { timeZone, locale } = resolve(opts)
  const startParts = zoneParts(start, timeZone, locale)
  const endParts = zoneParts(end, timeZone, locale)
  if (!startParts || !endParts) return null

  const dayNumber = (p: Parts) => Date.UTC(p.year, p.monthNumber - 1, p.day)
  let endDay = dayNumber(endParts)
  const rollsBack =
    endParts.hour < END_OF_NIGHT_HOUR ||
    (endParts.hour === END_OF_NIGHT_HOUR && endParts.minute === 0)
  if (rollsBack && startParts.hour >= END_OF_NIGHT_HOUR) {
    endDay -= 86400000
  }

  const days = Math.round((endDay - dayNumber(startParts)) / 86400000) + 1
  if (days <= 1) return null
  if (days > MAX_DURATION_DAYS) return null
  return `${days} days`
}

const MINUTE = 60000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export type RelativeOptions = FormatOptions & {
  /**
   * Past this distance, a relative string stops being useful and the absolute
   * date is returned instead. Defaults to 7 days.
   *
   * Tune it to the surface. A notification or an audit row wants hours. A
   * "last updated" wants days. Anything a person has to turn up to wants a
   * date, not a countdown.
   */
  cutoffMs?: number
}

/**
 * A timestamp as elapsed time, reading 'just now' or '3 minutes ago'. Falls
 * back to the absolute date once it is older than `cutoffMs`.
 *
 * Only ever a timestamp, never an event time: "in 3 days" is a worse answer
 * than "Fri 27 Nov" for something a person has to turn up to.
 *
 * Always expose the absolute string too, via `title` or a tooltip. A relative
 * time alone cannot be checked against a calendar or quoted to anyone.
 */
export function formatRelative(
  date: Instantish,
  opts: RelativeOptions
): string | null {
  const { locale, now } = resolve(opts)
  const then = toDate(date).getTime()
  if (Number.isNaN(then)) return null
  const cutoff = opts.cutoffMs ?? 7 * DAY

  const elapsed = toDate(now).getTime() - then
  if (Math.abs(elapsed) > cutoff) return formatDateTime(date, opts)

  // Under a minute reads as an instant either way.
  if (Math.abs(elapsed) < MINUTE) return 'just now'

  try {
    // 'auto' is what turns -1 day into 'yesterday' rather than '1 day ago'.
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    const magnitude = Math.abs(elapsed)
    const [unit, ms]: [Intl.RelativeTimeFormatUnit, number] =
      magnitude < HOUR
        ? ['minute', MINUTE]
        : magnitude < DAY
          ? ['hour', HOUR]
          : ['day', DAY]
    // Round first, then re-check: rounding 59m45s to 60 minutes overflows the
    // unit that was chosen before the rounding happened.
    let count = Math.round(magnitude / ms)
    let finalUnit = unit
    if (unit === 'minute' && count === 60) [count, finalUnit] = [1, 'hour']
    else if (unit === 'hour' && count === 24) [count, finalUnit] = [1, 'day']
    // Negative is the past, which is what Intl expects.
    return rtf.format(Math.sign(elapsed) * -count, finalUnit)
  } catch {
    return formatDateTime(date, opts)
  }
}

/**
 * The fields a length of time is made of. `Temporal.Duration` exposes exactly
 * these, so a Temporal value satisfies this without the package depending on
 * Temporal or shipping a polyfill. A plain object works too.
 */
export type DurationFields = {
  years?: number
  months?: number
  weeks?: number
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
  milliseconds?: number
}

/**
 * A length of time, however the caller holds one.
 *
 * A number is milliseconds, because that is what `end - start` gives you. A
 * string is an ISO 8601 duration, which is the language a `time` element's own
 * attribute speaks. The field form covers Temporal and hand-written objects.
 *
 * Years and months are refused rather than guessed. Neither has a fixed
 * length, so 'P1M' cannot become milliseconds without a calendar and a start
 * date. Use `formatDurationDays` for a run of calendar days: it counts them
 * against real dates instead of assuming.
 */
export type Durationish = number | string | DurationFields

const MS_PER_FIELD = {
  weeks: 7 * 24 * 60 * 60000,
  days: 24 * 60 * 60000,
  hours: 60 * 60000,
  minutes: 60000,
  seconds: 1000,
  milliseconds: 1
} as const

const ISO_DURATION =
  /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/

function fieldsToMs(fields: DurationFields): number | null {
  if (fields.years || fields.months) return null
  let ms = 0
  for (const [field, per] of Object.entries(MS_PER_FIELD)) {
    const value = fields[field as keyof typeof MS_PER_FIELD]
    if (value === undefined || value === null) continue
    if (!Number.isFinite(value)) return null
    ms += value * per
  }
  return ms
}

function parseIsoDuration(value: string): number | null {
  const m = ISO_DURATION.exec(value.trim())
  if (!m) return null
  const [, years, months, weeks, days, hours, minutes, seconds] = m
  // 'P' and 'PT' parse but mean nothing.
  if (![years, months, weeks, days, hours, minutes, seconds].some(Boolean)) {
    return null
  }
  return fieldsToMs({
    years: Number(years ?? 0),
    months: Number(months ?? 0),
    weeks: Number(weeks ?? 0),
    days: Number(days ?? 0),
    hours: Number(hours ?? 0),
    minutes: Number(minutes ?? 0),
    seconds: Number(seconds ?? 0)
  })
}

/** Resolve any accepted duration form to milliseconds. */
export function durationMilliseconds(value: Durationish): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') return parseIsoDuration(value)
  if (value && typeof value === 'object') return fieldsToMs(value)
  return null
}

/**
 * How a length words itself. One scale, from spelled out to compressed, the
 * same shape as the date scale.
 *
 * - `long`   2 hours 30 minutes: prose, a sentence, a detail line.
 * - `medium` 2 hrs 30 mins: a card or a table cell. Tight, but still words.
 * - `short`  2h 30m: a dense row, a badge, a tooltip.
 */
export type DurationStyle = 'long' | 'medium' | 'short'

/** Each unit spelled at the three lengths: letter, abbreviation, word. */
const DURATION_UNITS = {
  day: ['d', 'day', 'day'],
  hour: ['h', 'hr', 'hour'],
  minute: ['m', 'min', 'minute'],
  second: ['s', 'sec', 'second']
} as const

/**
 * A length of time, in words. For a running time, a support response window,
 * anything measured rather than scheduled.
 *
 * Units are coarse on purpose. Nobody needs '2 hours 31 minutes 12 seconds'.
 * Seconds appear only under a minute, where they are the whole answer.
 *
 * The style is about the room the surface has, not about the value. Pick one
 * per view and keep it: two registers in one list reads as two systems.
 */
export function formatDuration(
  value: Durationish,
  style: DurationStyle = 'long'
): string | null {
  const ms = durationMilliseconds(value)
  if (ms === null || ms < 0) return null
  const index = style === 'short' ? 0 : style === 'medium' ? 1 : 2
  const unit = (n: number, name: keyof typeof DURATION_UNITS) => {
    const word = DURATION_UNITS[name][index]
    // A letter is a suffix and never inflects; a word and an abbreviation both do.
    if (index === 0) return `${n}${word}`
    return `${n} ${word}${n === 1 ? '' : 's'}`
  }

  if (ms < MINUTE) {
    const seconds = Math.round(ms / 1000)
    // 59.6s rounds to 60, which is a minute, not sixty seconds.
    if (seconds === 60) return unit(1, 'minute')
    if (seconds === 0) {
      // Not '0 mins': the answer is 'nearly nothing', not 'nothing'.
      return ['0m', 'under a min', 'less than a minute'][index]!
    }
    return unit(seconds, 'second')
  }

  const totalMinutes = Math.round(ms / MINUTE)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days) parts.push(unit(days, 'day'))
  if (hours) parts.push(unit(hours, 'hour'))
  // Once you are into days, minutes are noise.
  if (minutes && !days) parts.push(unit(minutes, 'minute'))

  return parts.join(' ')
}

/**
 * A counting clock: '4:32', or '1:04:32' once there is an hour on it.
 *
 * For time remaining, where the reader is watching it move. Above five minutes
 * a coarse count reads better, because a ticking clock manufactures panic that
 * the situation does not warrant.
 */
export function formatCountdown(value: Durationish): string | null {
  const ms = durationMilliseconds(value)
  if (ms === null) return null
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${minutes}:${pad(seconds)}`
}

/**
 * ISO 8601 duration, for a `<time datetime="…">` that carries a length rather
 * than a moment. 'PT2H30M', 'P3D'.
 */
export function formatMachineDuration(value: Durationish): string | null {
  const ms = durationMilliseconds(value)
  if (ms === null || ms < 0) return null
  // Round once, to whole milliseconds, then derive every field from that. A
  // fraction rounded on its own can carry to 60 and be erased by `% 60`,
  // leaving every field zero and the invalid duration 'P'.
  const totalMs = Math.round(ms)
  if (totalMs === 0) return 'PT0S'
  const days = Math.floor(totalMs / 86_400_000)
  const hours = Math.floor((totalMs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000)
  // ISO 8601 allows a fraction, and 'PT0S' beside 'less than a minute' is a
  // contradiction the markup should not publish.
  const seconds = Number(((totalMs % 60_000) / 1000).toFixed(3))
  const time = [
    hours ? `${hours}H` : '',
    minutes ? `${minutes}M` : '',
    seconds ? `${seconds}S` : ''
  ].join('')
  return `P${days ? `${days}D` : ''}${time ? `T${time}` : ''}`
}

/** A middot separates a date from an adjacent fact. */
export function joinWithFact(date: string, fact: string | null): string {
  return fact ? `${date} ${MIDDOT} ${fact}` : date
}

export const separators = {
  range: RANGE,
  fact: MIDDOT,
  dateTime: DATE_TIME_SEPARATOR
} as const
