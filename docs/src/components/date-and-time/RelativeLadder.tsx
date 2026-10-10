import { ProseDataTable } from '@/components/ProseTable'

import { DATE_TIME_TABLES } from './example'

/** The relative ladder for moments behind or ahead of the example's now. */
export function RelativeLadder({
  direction
}: {
  direction: 'past' | 'future'
}) {
  return (
    <ProseDataTable
      slot={`${direction}-ladder`}
      table={DATE_TIME_TABLES.RelativeLadder(direction)}
    />
  )
}
