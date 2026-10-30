import { compareDates, dayNumber, isPlainDate } from '../datetime/plainDate'
import {
  type ComparisonOptions,
  type ResolvedDateRange,
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
  /** The field the comparison value goes in on this period's rows. */
  as: string
}

type Slot = { day: string; time: string }

const slotOf = (value: PlotRow[string] | undefined): Slot | null => {
  if (typeof value !== 'string') return null
  const day = value.slice(0, 10)
  return isPlainDate(day) ? { day, time: value.slice(10) } : null
}

const within = (day: string, range: { start: string; end: string }) =>
  compareDates(day, range.start) >= 0 && compareDates(day, range.end) <= 0

function datesOf(range: ResolvedDateRange | null) {
  return range?.kind === 'dates' ? range : null
}

function comparisonDates(options: AlignComparisonOptions) {
  const { range, compare } = options.period
  if (!compare || !isBuiltInComparison(compare)) return null
  const resolved = resolveComparison(range, compare, options)
  if (resolved.status === 'unavailable') return null
  const current = datesOf(resolveDateRange(range, options))
  const compared = datesOf(resolved.range)
  return current && compared ? { current, compared } : null
}

/**
 * This period's rows, each with last period's value under `as`, so a chart's
 * `comparison` can draw it. Rows line up day by day from each range's start,
 * at the same time of day, so a month lines up with a shorter one and the
 * previous year can keep its weekdays (`alignWeekday`). A row the comparison
 * doesn't cover, or that falls before `dataStart`, gets null.
 */
export function alignComparison(
  rows: readonly PlotRow[],
  comparisonRows: readonly PlotRow[],
  options: AlignComparisonOptions
): PlotRow[] {
  const dates = comparisonDates(options)
  const values = new Map<string, PlotRow[string]>()
  for (const row of comparisonRows) {
    const slot = slotOf(row[options.x])
    const key = slot && `${dayNumber(slot.day)}${slot.time}`
    if (key && !values.has(key)) values.set(key, row[options.y] ?? null)
  }
  const valueFor = (slot: Slot | null) => {
    if (!dates || !slot || !within(slot.day, dates.current)) return null
    const offset = dayNumber(slot.day) - dayNumber(dates.current.start)
    const day = dayNumber(dates.compared.start) + offset
    if (day > dayNumber(dates.compared.end)) return null
    if (options.dataStart && day < dayNumber(options.dataStart)) return null
    return values.get(`${day}${slot.time}`) ?? null
  }
  return rows.map((row) => ({
    ...row,
    [options.as]: valueFor(slotOf(row[options.x]))
  }))
}
