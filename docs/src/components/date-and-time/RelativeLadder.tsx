import { ReadsTable } from './ReadsTable'
import { futureLadderRows, pastLadderRows } from './example'

/** The relative ladder for moments behind or ahead of the example's now. */
export function RelativeLadder({
  direction
}: {
  direction: 'past' | 'future'
}) {
  return (
    <ReadsTable
      slot={`${direction}-ladder`}
      head={['Distance', 'Reads']}
      rows={direction === 'past' ? pastLadderRows() : futureLadderRows()}
    />
  )
}
