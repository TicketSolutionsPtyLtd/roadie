import { ProseTable } from '@/components/date-and-time/ReadsTable'

import {
  type Comparison,
  type DateRangeValue,
  describeDateRange,
  resolveComparison
} from '@oztix/roadie-core/datetime'

// Wed 7 Oct 2026 in Melbourne, with sales data to that day.
const PERIOD_EXAMPLE = {
  now: new Date('2026-10-07T02:00:00Z'),
  timeZone: 'Australia/Melbourne',
  dataEnd: '2026-10-07'
}

const PERIODS: DateRangeValue[] = [
  'last-month',
  { period: 'month', offset: 0, toDate: true },
  'this-month',
  { direction: 'past', amount: 30, unit: 'day' },
  { period: 'year', offset: 0, fiscal: true }
]

const coveredBy = (range: DateRangeValue, compare: Comparison) => {
  const resolved = resolveComparison(range, compare, PERIOD_EXAMPLE).range
  return resolved?.kind === 'dates'
    ? describeDateRange(resolved, PERIOD_EXAMPLE).detail
    : ''
}

/** The dates each period and its comparisons cover on Wed 7 Oct 2026, from `resolveComparison`. */
export function PeriodComparisons() {
  return (
    <ProseTable
      slot='period-comparisons'
      head={['Period', 'Previous period', 'Previous year']}
    >
      {PERIODS.map((range) => {
        const { label, detail } = describeDateRange(range, PERIOD_EXAMPLE)
        return (
          <tr key={label}>
            <td>
              {label}, {detail}
            </td>
            <td>{coveredBy(range, 'previous-period')}</td>
            <td>{coveredBy(range, 'previous-year')}</td>
          </tr>
        )
      })}
    </ProseTable>
  )
}
