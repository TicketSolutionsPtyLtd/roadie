import { ProseDataTable } from '@/components/ProseTable'
import { rhythmTable } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** Line height and letter spacing for each text context, from its tokens. */
export async function RhythmTable() {
  return (
    <ProseDataTable
      slot='rhythm-table'
      table={rhythmTable(await getTokens())}
    />
  )
}
