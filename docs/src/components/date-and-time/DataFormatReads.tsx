import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** The example show as each data context formats it. */
export function DataFormatReads() {
  return (
    <ProseDataTable
      slot='data-format-reads'
      table={DATE_TIME_TABLES.DataFormatReads()}
    />
  )
}
