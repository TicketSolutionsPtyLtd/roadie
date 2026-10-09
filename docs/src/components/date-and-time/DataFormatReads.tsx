import { ReadsTable } from './ReadsTable'
import { dataFormatRows } from './example'

/** The example show as each data context formats it. */
export function DataFormatReads() {
  return (
    <ReadsTable
      slot='data-format-reads'
      head={['Where', 'Reads']}
      rows={dataFormatRows()}
    />
  )
}
