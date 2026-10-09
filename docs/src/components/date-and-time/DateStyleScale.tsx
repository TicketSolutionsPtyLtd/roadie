import { ReadsTable } from './ReadsTable'
import { dateStyleRows } from './example'

/** The example show in each `dateStyle`, from `formatDateTime`. */
export function DateStyleScale() {
  return (
    <ReadsTable
      slot='date-style-scale'
      head={['Style', 'Renders']}
      rows={dateStyleRows()}
      codeNames
    />
  )
}
