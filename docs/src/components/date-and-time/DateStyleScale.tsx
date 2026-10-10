import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** The example show in each `dateStyle`, from `formatDateTime`. */
export function DateStyleScale() {
  return (
    <ProseDataTable
      slot='date-style-scale'
      table={DATE_TIME_TABLES.DateStyleScale()}
    />
  )
}
