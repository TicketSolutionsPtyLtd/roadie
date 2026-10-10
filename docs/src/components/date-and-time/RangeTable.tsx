import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** Each relative range's label and the dates it covers, from `describeDateRange`. */
export function RangeTable() {
  return (
    <ProseDataTable slot='range-table' table={DATE_TIME_TABLES.RangeTable()} />
  )
}
