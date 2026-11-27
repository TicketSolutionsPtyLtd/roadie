import type { KeyboardEvent } from 'react'

import { isSelecting, useRecordsLayoutValue, useRecordsStable } from './context'

/** Escape inside the records leaves Select mode where it shows, unless something nearer used it. */
export function useLeaveSelectOnEscape() {
  // The records as the key lands, so a tick renders nothing here.
  const { latestRecords } = useRecordsStable()
  const { selectMode } = useRecordsLayoutValue()
  return (event: KeyboardEvent<HTMLElement>) => {
    const records = latestRecords.current
    if (
      event.key !== 'Escape' ||
      event.defaultPrevented ||
      !isSelecting(records, selectMode)
    )
      return
    // A portalled menu's keys bubble here through React; its Escape is its own.
    if (!event.currentTarget.contains(event.target as Node)) return
    event.preventDefault()
    records.setSelecting(false)
  }
}
