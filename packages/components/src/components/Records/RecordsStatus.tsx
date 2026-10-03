'use client'

import { errorMessage } from './RecordsStates'
import { useRecordsContext } from './context'

const count = new Intl.NumberFormat('en-AU')

/** Announces loading, errors and the result count to screen readers. */
export function RecordsStatus() {
  const { records } = useRecordsContext()
  const total = records.resultCount
  // A retained error goes quiet during the fetch so it announces again after.
  const message = records.error
    ? records.loading
      ? ''
      : errorMessage(records)
    : records.loading && records.rows.length === 0
      ? 'Loading'
      : records.filtered
        ? `${count.format(total)} ${total === 1 ? 'result' : 'results'}`
        : ''
  return (
    <p role='status' data-slot='records-status' className='sr-only'>
      {message}
    </p>
  )
}
RecordsStatus.displayName = 'Records.Status'
