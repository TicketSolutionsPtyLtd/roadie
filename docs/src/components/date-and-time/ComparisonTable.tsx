import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** Each comparison of month to date, from `resolveComparison` and `describeComparison`. */
export function ComparisonTable() {
  return (
    <ProseDataTable
      slot='comparison-table'
      table={DATE_TIME_TABLES.ComparisonTable()}
    />
  )
}
