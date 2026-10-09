'use client'

import { useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RangeErrorMessage } from '../Records/RecordPlaceholder'
import { tableRowSize } from '../Records/rowSizing'
import { useKeepFocusInTable } from '../Records/tableFocus'

export function RecordTableRangeError({
  rowIndex,
  columns
}: {
  rowIndex: number
  columns: number
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  useKeepFocusInTable(rowRef)
  return (
    <div
      ref={rowRef}
      role='row'
      aria-rowindex={rowIndex}
      data-slot='record-table-range-error'
      className={cn(
        'flex min-w-(--record-table-min-width) border-b border-subtler',
        tableRowSize.heightClass
      )}
    >
      {/* Sticky, so it stays in view when the table scrolls sideways. */}
      <div
        role='cell'
        aria-colspan={columns}
        className='sticky start-0 flex items-center gap-2 ps-(--content-inset) pe-(--content-inset)'
      >
        <RangeErrorMessage />
      </div>
    </div>
  )
}
