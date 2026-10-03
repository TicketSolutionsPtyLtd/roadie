import type { DateRangePreset } from '../DateRangePicker/range'

/** Ahead for shows on sale, back for sales, and the financial year. */
export const dashboardPeriodPresets: readonly DateRangePreset[] = [
  { value: { direction: 'next', amount: 30, unit: 'day' } },
  { value: { direction: 'next', amount: 90, unit: 'day' } },
  { value: { direction: 'past', amount: 30, unit: 'day' } },
  { value: { direction: 'past', amount: 12, unit: 'month' } },
  { value: { period: 'year', offset: 0, fiscal: true } }
]
