import type { KeyboardEvent } from 'react'

import { isSelecting, useRecordsContext } from './context'

/** Escape inside the records leaves Select mode where it shows, unless something nearer used it. */
export function useLeaveSelectOnEscape() {
  const { records, selectMode } = useRecordsContext()
  const selecting = isSelecting(records, selectMode)
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !selecting) return
    // A portalled menu's keys bubble here through React; its Escape is its own.
    if (!event.currentTarget.contains(event.target as Node)) return
    event.preventDefault()
    records.setSelecting(false)
  }
}
