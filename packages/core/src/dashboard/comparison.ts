import { parseWallTime } from '../dataviz/wallTime'
import {
  addMonths,
  dayNumber,
  fromDayNumber,
  plainDateParts
} from '../datetime/plainDate'
import {
  type ComparisonOptions,
  type ResolvedDateRange,
  calendarUnit,
  isBuiltInComparison,
  resolveComparison,
  resolveDateRange
} from '../datetime/ranges'
import type { PlotRow } from './plots'
import type { DashboardPeriodSpec } from './schema'

export type AlignComparisonOptions = ComparisonOptions & {
  /** The dashboard's period: its range, and the comparison to line up. */
  period: Pick<DashboardPeriodSpec, 'range' | 'compare'>
  /** The field holding each row's date, or date and time, in venue wall time. */
  x: string
  /** The field to carry over from the comparison rows. */
  y: string
  /** The field naming each row's series, so each lines up with its own. */
  series?: string
  /** The field the comparison value goes in on this period's rows. */
  as: string
}

const MS_PER_DAY = 86_400_000

type Slot = { day: number; time: number }

const slotOf = (value: PlotRow[string] | undefined): Slot | null => {
  const wall = parseWallTime(value)
  if (wall === null) return null
  const day = Math.floor(wall / MS_PER_DAY)
  return { day, time: wall - day * MS_PER_DAY }
}

type DayRange = { start: number; end: number }

function dayRange(range: ResolvedDateRange | null): DayRange | null {
  return range?.kind === 'dates'
    ? { start: dayNumber(range.start), end: dayNumber(range.end) }
    : null
}

/** The same date `months` earlier, or null when that month is too short. */
function sameDateMonthsEarlier(day: number, months: number): number | null {
  const date = fromDayNumber(day)
  const earlier = addMonths(date, -months)
  return plainDateParts(earlier).day === plainDateParts(date).day
    ? dayNumber(earlier)
    : null
}

declare const process: { env?: { NODE_ENV?: string } } | undefined

const warned = new Set<string>()

function warnInstants(range: AlignComparisonOptions['period']['range']) {
  if (typeof process === 'undefined' || process?.env?.NODE_ENV === 'production')
    return
  const key = JSON.stringify(range)
  if (warned.has(key)) return
  warned.add(key)
  console.warn(
    `Roadie's alignComparison lines up whole days, so the period ${key}, which has times, gets no comparison values.`
  )
}

/** How many months back each day's match is, when the period is in months. */
function monthsBack(options: AlignComparisonOptions): number | null {
  const { range, compare } = options.period
  if (compare === 'previous-year') return options.alignWeekday ? null : 12
  const unit = compare === 'previous-period' ? calendarUnit(range) : null
  return unit && 'months' in unit ? unit.months : null
}

function comparisonDays(options: AlignComparisonOptions) {
  const { range, compare } = options.period
  if (!compare || !isBuiltInComparison(compare)) return null
  const resolvedRange = resolveDateRange(range, options)
  if (resolvedRange.kind === 'instants') {
    warnInstants(range)
    return null
  }
  const resolved = resolveComparison(range, compare, options)
  if (resolved.status === 'unavailable') return null
  const current = dayRange(resolvedRange)
  const compared = dayRange(resolved.range)
  if (!current || !compared) return null
  const months = monthsBack(options)
  const first = options.dataStart ? dayNumber(options.dataStart) : -Infinity
  return (day: number): number | null => {
    if (day < current.start || day > current.end) return null
    const then =
      months === null
        ? compared.start + day - current.start
        : sameDateMonthsEarlier(day, months)
    return then !== null && then >= first && then <= compared.end ? then : null
  }
}

/**
 * This period's rows, each with the comparison's value under `as`, at the
 * same time of day. The previous period of a month, quarter or year keeps the
 * day of the month, and the previous year keeps its dates, or its weekdays
 * with `alignWeekday`; any other period lines up day by day from each range's
 * start. A row the comparison doesn't cover, one before `dataStart`, or a day
 * the earlier month lacks gets null. Where comparison rows repeat an x (and
 * series), the first one counts. A period with times, such as the past 6
 * hours, resolves to instants rather than days, so every row gets null; it
 * warns in development.
 */
export function alignComparison(
  rows: readonly PlotRow[],
  comparisonRows: readonly PlotRow[],
  options: AlignComparisonOptions
): PlotRow[] {
  const comparedDay = comparisonDays(options)
  const keyOf = (row: PlotRow, day: number, time: number) =>
    JSON.stringify([day, time, options.series && row[options.series]])
  const values = new Map<string, PlotRow[string]>()
  for (const row of comparisonRows) {
    const slot = slotOf(row[options.x])
    const key = slot && keyOf(row, slot.day, slot.time)
    if (key && !values.has(key)) values.set(key, row[options.y] ?? null)
  }
  const valueFor = (row: PlotRow) => {
    const slot = slotOf(row[options.x])
    if (!slot || !comparedDay) return null
    const day = comparedDay(slot.day)
    return day === null
      ? null
      : (values.get(keyOf(row, day, slot.time)) ?? null)
  }
  return rows.map((row) => ({ ...row, [options.as]: valueFor(row) }))
}
