import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** Each Australian zone's abbreviations and daylight saving, from Intl. */
export function ZoneTable() {
  return (
    <ProseDataTable slot='zone-table' table={DATE_TIME_TABLES.ZoneTable()} />
  )
}
