'use client'

import { useEffect, useState } from 'react'

import { errorMessage, rangeErrorMessage } from './RecordsStates'
import { isSelecting, useRecordsContext } from './context'

const count = new Intl.NumberFormat('en-AU')
// Long enough to sit between keystrokes, so a search announces its count once.
const SETTLE_MS = 500

/** The value once it has held still, so a burst of changes announces once. While `hold`, it keeps the last one. */
function useSettled(value: string, hold: boolean) {
  const [settled, setSettled] = useState(hold ? '' : value)
  useEffect(() => {
    if (hold || value === settled) return
    const timer = setTimeout(() => setSettled(value), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [value, settled, hold])
  return settled
}

/** Announces loading, errors, the result count and the selection to screen readers. */
export function RecordsStatus() {
  const { records, selectMode } = useRecordsContext()
  const total = records.resultCount
  const selected = records.selectedCount
  const { range } = records
  // Until a range list knows its total, a count would announce on every load.
  const unknown = range !== undefined && range.total === undefined
  const results = useSettled(
    records.filtered && !unknown
      ? `${count.format(total)} ${total === 1 ? 'result' : 'results'}`
      : '',
    // A server's count is the last search's until the new one loads.
    records.loading
  )
  const selection =
    selected || isSelecting(records, selectMode)
      ? [
          // Entering says so; once records are picked the count is enough.
          !selected && 'Select mode',
          `${count.format(selected)} selected`,
          results
        ]
          .filter(Boolean)
          .join(', ')
      : results
  // A retained error goes quiet during the fetch so it announces again after.
  const message = records.error
    ? records.loading
      ? ''
      : errorMessage(records)
    : range?.failed.length
      ? range.loading
        ? ''
        : rangeErrorMessage(records)
      : (records.loading || range?.loading) && records.rows.length === 0
        ? 'Loading'
        : selection
  return (
    <p role='status' data-slot='records-status' className='sr-only'>
      {message}
    </p>
  )
}
RecordsStatus.displayName = 'Records.Status'
