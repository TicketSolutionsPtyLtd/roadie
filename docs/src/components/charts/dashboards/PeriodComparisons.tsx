import { ProseDataTable } from '@/components/ProseTable'
import { periodComparisonsTable } from '@/lib/dashboard-limits'

/** The dates each period and its comparisons cover on Wed 7 Oct 2026, from `resolveComparison`. */
export function PeriodComparisons() {
  return (
    <ProseDataTable
      slot='period-comparisons'
      table={periodComparisonsTable()}
    />
  )
}
