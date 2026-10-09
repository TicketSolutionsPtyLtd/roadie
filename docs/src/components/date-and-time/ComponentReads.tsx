import { ReadsTable } from './ReadsTable'
import { componentReads } from './example'

/** What each date component reads for the example show, from the formatter behind it. */
export function ComponentReads() {
  return (
    <ReadsTable
      slot='component-reads'
      head={['Component', 'Reads']}
      rows={componentReads()}
      codeNames
    />
  )
}
