import { formatDateRange, formatDateTime } from './format'
import { plainDateParts } from './plainDate'
import {
  type AbsoluteRange,
  type Comparison,
  type DateRangeOptions,
  type DateRangeValue,
  type PeriodRange,
  type RelativeRange,
  type ResolvedDateRange,
  isAbsoluteRange,
  isPeriodRange,
  isRollingRange,
  resolveAbsolute,
  resolveDateRange
} from './ranges'

export type DescribeOptions = DateRangeOptions & { locale?: string }

export type DateRangeDescription = {
  /** The words a person would use: "This weekend", "Month to date". */
  label: string
  /** The dates the words stand for, so the absolute is always reachable. */
  detail: string
}

const NAMED: Record<Extract<RelativeRange, string>, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  yesterday: 'Yesterday',
  'this-week': 'This week',
  'this-weekend': 'This weekend',
  'next-week': 'Next week',
  'last-week': 'Last week',
  'this-month': 'This month',
  'next-month': 'Next month',
  'last-month': 'Last month',
  upcoming: 'Upcoming',
  past: 'Past',
  ongoing: 'Happening now'
}

const DAY_WORDS: Record<number, string> = {
  [-1]: 'Yesterday',
  0: 'Today',
  1: 'Tomorrow'
}
const OFFSET_WORDS: Record<number, string> = {
  [-1]: 'Last',
  0: 'This',
  1: 'Next'
}

function periodNoun({ period, fiscal }: PeriodRange): string {
  return fiscal && (period === 'quarter' || period === 'year')
    ? `financial ${period}`
    : period
}

function periodLabel(range: PeriodRange): string | null {
  const { period, offset, toDate } = range
  if (period === 'day') return DAY_WORDS[offset] ?? null
  const word = OFFSET_WORDS[offset]
  if (!word) return null
  const noun = periodNoun(range)
  if (!toDate) return `${word} ${noun}`
  if (offset === 0) return `${noun[0]!.toUpperCase()}${noun.slice(1)} to date`
  return `${word} ${noun} to date`
}

/** The relative wording for a range, or null when only dates will do. */
export function relativeLabel(value: DateRangeValue): string | null {
  if (isAbsoluteRange(value)) return null
  if (isRollingRange(value)) {
    const { direction, amount, unit } = value
    return `${direction === 'next' ? 'Next' : 'Last'} ${amount} ${unit}${amount === 1 ? '' : 's'}`
  }
  if (isPeriodRange(value)) return periodLabel(value)
  return NAMED[value]
}

// Noon UTC, formatted in UTC, so a plain date reads as itself in every zone.
export function plainDateInstant(date: string): Date {
  const { year, month, day } = plainDateParts(date)
  const instant = new Date(0)
  instant.setUTCFullYear(year, month - 1, day)
  instant.setUTCHours(12)
  return instant
}

export function formatResolved(
  range: ResolvedDateRange,
  timeZone: string,
  locale: string | undefined
): string {
  if (range.kind === 'dates') {
    return (
      formatDateRange(
        plainDateInstant(range.start),
        plainDateInstant(range.end),
        { timeZone: 'UTC', dateStyle: 'medium', locale }
      ) ?? ''
    )
  }
  const opts = {
    timeZone,
    locale,
    dateStyle: 'medium',
    timeStyle: 'medium'
  } as const
  const { start, end } = range
  if (start === null) {
    return `Until ${formatDateTime(new Date(end!), opts)}`
  }
  if (end === null) return `From ${formatDateTime(new Date(start), opts)}`
  return formatDateRange(new Date(start), new Date(end), opts) ?? ''
}

/**
 * A range in words, with the dates it stands for. Show `label` and keep
 * `detail` reachable, in a tooltip or beside it.
 */
export function describeDateRange(
  value: DateRangeValue,
  options: DescribeOptions
): DateRangeDescription {
  const detail = formatResolved(
    resolveDateRange(value, options),
    options.timeZone,
    options.locale
  )
  return { label: relativeLabel(value) ?? detail, detail }
}

export type DescribeComparisonOptions = {
  /** Needed only when a custom comparison carries date-times. */
  timeZone?: string
  locale?: string
}

/** The context line under a delta: "vs previous period". */
export function describeComparison(
  comparison: Comparison,
  options: DescribeComparisonOptions = {}
): string {
  if (comparison === 'previous-period') return 'vs previous period'
  if (comparison === 'previous-year') return 'vs previous year'
  return `vs ${describeAbsolute(comparison, options)}`
}

function describeAbsolute(
  range: AbsoluteRange,
  { timeZone, locale }: DescribeComparisonOptions
): string {
  const resolved = resolveAbsolute(range, timeZone ?? 'UTC')
  if (resolved.kind === 'instants' && !timeZone) {
    throw new RangeError('A comparison with times needs a timeZone')
  }
  return formatResolved(resolved, timeZone ?? 'UTC', locale)
}
