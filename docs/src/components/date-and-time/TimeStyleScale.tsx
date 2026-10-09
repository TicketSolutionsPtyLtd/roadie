import { ReadsTable } from './ReadsTable'
import { timeStyleRows } from './example'

/** The example show's time in each `timeStyle`, from `formatTimeOfDay`. */
export function TimeStyleScale() {
  return (
    <ReadsTable
      slot='time-style-scale'
      head={['Style', 'Renders']}
      rows={timeStyleRows()}
      codeNames
    />
  )
}
