'use client'

import { useLayoutEffect, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Button } from '../Button'
import {
  isSelecting,
  selectModeApplies,
  useRecordsContext,
  useRecordsData,
  useRecordsLayoutValue
} from './context'
import { useLeaveSelectOnEscape } from './selectMode'
import { pageState } from './selection'
import { hiddenByStyle } from './tableFocus'
import { useSurvivor } from './useBulkActions'

export type RecordsSelectProps = {
  className?: string
}

/**
 * Select and Done, with Select all, for a layout that selects through Select
 * mode. Renders nothing while the shown layout gives each record a checkbox.
 */
export function RecordsSelect({ className }: RecordsSelectProps) {
  const { selectMode, layouts } = useRecordsLayoutValue()
  const { selectable, view } = useRecordsData()
  if (!selectable || !selectModeApplies(layouts, view, selectMode)) return null
  // Only the controls read the selection, so a tick in a table renders nothing here.
  return (
    <SelectControls
      className={cn(
        // A layout that selects this way only when narrow has checkboxes above 40rem.
        !selectMode && '@min-[40rem]:hidden',
        className
      )}
    />
  )
}
RecordsSelect.displayName = 'Records.Select'

function SelectControls({ className }: RecordsSelectProps) {
  const { records, selectMode, setSelectControls } = useRecordsContext()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const survivor = useSurvivor('selection')
  const leaveSelect = useLeaveSelectOnEscape()
  const selecting = isSelecting(records, true)

  // Only a floating bar reads it, and a layout that selects this way only when narrow keeps its bar in the header.
  useLayoutEffect(() => {
    setSelectControls(selecting && selectMode)
    return () => setSelectControls(false)
  }, [selecting, selectMode, setSelectControls])

  // Leaving from a record's checkbox unmounts it; focus lands back here.
  const was = useRef(selecting)
  useLayoutEffect(() => {
    if (was.current === selecting) return
    was.current = selecting
    const active = document.activeElement
    // A re-flowed row's checkbox hides as Select mode ends, focus and all.
    if (active === null || active === document.body || hiddenByStyle(active))
      toggleRef.current?.focus()
  })

  const pageIds = records.rows.map((row) => row.id)
  const allShown = pageState(records.selection, pageIds) === true
  return (
    <div
      role={selecting ? 'group' : undefined}
      aria-label={selecting ? 'Select mode' : undefined}
      data-slot='records-select'
      onKeyDown={leaveSelect}
      className={cn('flex shrink-0 items-center gap-2', className)}
    >
      {selecting && (
        <Button
          disabled={pageIds.length === 0}
          // Clears every page too, as after the bulk bar's Select all N.
          onClick={() =>
            allShown ? records.clearSelection() : records.selectPage(true)
          }
        >
          {allShown ? 'Deselect all' : 'Select all'}
        </Button>
      )}
      {/* One element for Select and Done, so focus stays on it across the switch. */}
      <Button
        ref={toggleRef}
        {...survivor}
        onClick={() => records.setSelecting(!selecting)}
      >
        {selecting ? 'Done' : 'Select'}
      </Button>
    </div>
  )
}
