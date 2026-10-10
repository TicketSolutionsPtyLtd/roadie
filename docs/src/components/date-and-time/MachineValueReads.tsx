import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** The `datetime` value for each shape, from `formatMachine`. */
export function MachineValueReads() {
  return (
    <ProseDataTable
      slot='machine-value-reads'
      table={DATE_TIME_TABLES.MachineValueReads()}
    />
  )
}
