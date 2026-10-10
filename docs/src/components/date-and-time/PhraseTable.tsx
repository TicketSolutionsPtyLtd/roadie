import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** What `parseDatePhrase` suggests for typed text, best first. */
export function PhraseTable() {
  return (
    <ProseDataTable
      slot='phrase-table'
      table={DATE_TIME_TABLES.PhraseTable()}
    />
  )
}
