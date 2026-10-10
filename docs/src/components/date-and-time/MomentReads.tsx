import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** How each kind of moment usually reads, from the formatters. */
export function MomentReads() {
  return (
    <ProseDataTable
      slot='moment-reads'
      table={DATE_TIME_TABLES.MomentReads()}
    />
  )
}
