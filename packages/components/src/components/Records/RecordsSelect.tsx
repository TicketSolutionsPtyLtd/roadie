'use client'

import { useLayoutEffect, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Button } from '../Button'
import { isSelecting, useRecordsContext } from './context'
import { leaveSelectOnEscape } from './selectMode'
import { pageState } from './selection'
import { useSurvivor } from './useBulkActions'

export type RecordsSelectProps = {
  className?: string
}

/**
 * Select and Done, with Select all, for a layout that selects through Select
 * mode. Renders nothing while the shown layout gives each record a checkbox.
 */
export function RecordsSelect({ className }: RecordsSelectProps) {
  const { records, selectMode, setSelectControls } = useRecordsContext()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const survivor = useSurvivor('selection')
  const shown = selectMode && records.selectable
  const selecting = shown && isSelecting(records, selectMode)

  useLayoutEffect(() => {
    setSelectControls(selecting)
    return () => setSelectControls(false)
  }, [selecting, setSelectControls])

  // Leaving from a record's checkbox unmounts it; focus lands back here.
  const was = useRef(selecting)
  useLayoutEffect(() => {
    if (was.current === selecting) return
    was.current = selecting
    const active = document.activeElement
    if (active === null || active === document.body) toggleRef.current?.focus()
  })

  if (!shown) return null
  const pageIds = records.rows.map((row) => row.id)
  const allShown = pageState(records.selection, pageIds) === true
  return (
    <div
      role={selecting ? 'group' : undefined}
      aria-label={selecting ? 'Select mode' : undefined}
      data-slot='records-select'
      onKeyDown={leaveSelectOnEscape(records)}
      className={cn('flex shrink-0 items-center gap-2', className)}
    >
      {selecting && (
        <Button
          emphasis='subtler'
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
        emphasis={selecting ? 'strong' : 'normal'}
        // The switch to Done is instant; a colour fade flashes grey.
        className='transition-[scale]!'
        onClick={() => records.setSelecting(!selecting)}
      >
        {selecting ? 'Done' : 'Select'}
      </Button>
    </div>
  )
}
RecordsSelect.displayName = 'Records.Select'
