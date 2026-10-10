import {
  CHART_LABEL_LIMITS,
  COPY_LIMITS,
  type CardSize
} from '@oztix/roadie-core/dashboard-layout'
import {
  type Comparison,
  type DateRangeValue,
  describeDateRange,
  resolveComparison
} from '@oztix/roadie-core/datetime'

import type { TwinTable } from './twin-table'

const LIMIT_SIZES: CardSize[] = ['stat', 'md']

const CHART_LABEL_SIZES: (keyof typeof CHART_LABEL_LIMITS)[] = [
  'sm',
  'md',
  'lg',
  'full'
]

/** Label and context lengths for stat and `md` cards, from `COPY_LIMITS`. */
export const copyLimitsTable = (): TwinTable => ({
  head: ['Size', 'Label', 'Context'],
  rows: LIMIT_SIZES.map((size) => [
    [{ code: size }],
    `${COPY_LIMITS[size].label} characters`,
    `${COPY_LIMITS[size].context} characters`
  ])
})

/** Chart card label lengths at each size, from `CHART_LABEL_LIMITS`. */
export const chartLabelLimitsTable = (): TwinTable => ({
  head: ['Size', 'Label'],
  rows: CHART_LABEL_SIZES.map((size) => [
    [{ code: size }],
    `${CHART_LABEL_LIMITS[size]} characters`
  ])
})

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
export const periodComparisonsTable = (): TwinTable => ({
  head: ['Period', 'Previous period', 'Previous year'],
  rows: PERIODS.map((range) => {
    const { label, detail } = describeDateRange(range, PERIOD_EXAMPLE)
    return [
      `${label}, ${detail}`,
      coveredBy(range, 'previous-period'),
      coveredBy(range, 'previous-year')
    ]
  })
})
