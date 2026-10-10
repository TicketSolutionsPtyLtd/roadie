import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** What each date component reads for the example show, from the formatter behind it. */
export function ComponentReads() {
  return (
    <ProseDataTable
      slot='component-reads'
      table={DATE_TIME_TABLES.ComponentReads()}
    />
  )
}
