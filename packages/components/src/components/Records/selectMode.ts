import type { KeyboardEvent } from 'react'

import type { RecordsInstance } from './useRecords'

/** Escape inside the records leaves Select mode, unless something nearer used it. */
export const leaveSelectOnEscape =
  (records: Pick<RecordsInstance, 'selecting' | 'setSelecting'>) =>
  (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !records.selecting)
      return
    // A portalled menu's keys bubble here through React; its Escape is its own.
    if (!event.currentTarget.contains(event.target as Node)) return
    event.preventDefault()
    records.setSelecting(false)
  }
