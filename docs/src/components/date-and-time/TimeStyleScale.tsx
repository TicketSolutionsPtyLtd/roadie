import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** The example show's time in each `timeStyle`, from `formatTimeOfDay`. */
export function TimeStyleScale() {
  return (
    <ProseDataTable
      slot='time-style-scale'
      table={DATE_TIME_TABLES.TimeStyleScale()}
    />
  )
}
