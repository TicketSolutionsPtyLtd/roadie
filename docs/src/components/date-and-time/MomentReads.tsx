import { ReadsTable } from './ReadsTable'
import { momentRows } from './example'

/** How each kind of moment usually reads, from the formatters. */
export function MomentReads() {
  return (
    <ReadsTable
      slot='moment-reads'
      head={['Kind', 'Looks like']}
      rows={momentRows()}
    />
  )
}
