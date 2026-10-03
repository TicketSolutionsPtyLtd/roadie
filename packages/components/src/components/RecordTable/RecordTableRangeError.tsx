'use client'

import { useRef } from 'react'

import { WarningIcon } from '@phosphor-icons/react'

import { Button } from '../Button'
import { rangeErrorMessage } from '../Records/RecordsStates'
import { useRecordsContext } from '../Records/context'
import type { RecordsRangeState } from '../Records/types'
import { tableFocusTarget, useKeepFocusInTable } from './tableFocus'

/**
 * Where a row sits in a failed range: the error shows at the first row on
 * screen not loaded, so it stays in view beside any rows the page did load,
 * and the rest are blank. Undefined outside one.
 */
export function failedRowAt(
  range: Pick<RecordsRangeState, 'failed' | 'count' | 'rowAt'>,
  index: number,
  first = 0
): { start: number; error: boolean } | undefined {
  const failed = range.failed.find(
    ({ start, end }) => index >= start && index < end
  )
  if (!failed) return undefined
  const end = Math.min(failed.end, range.count)
  const missing = (from: number) => {
    for (let at = from; at < end; at++)
      if (range.rowAt(at) === undefined) return at
    return undefined
  }
  const shown =
    missing(Math.max(first, failed.start)) ??
    missing(failed.start) ??
    failed.start
  return { start: failed.start, error: index === shown }
}

export const rangeErrorKey = (start: number) => `range-error-${start}`

export function RecordTableRangeError({
  rowIndex,
  columns
}: {
  rowIndex: number
  columns: number
}) {
  const { records } = useRecordsContext()
  const rowRef = useRef<HTMLDivElement>(null)
  useKeepFocusInTable(rowRef)
  return (
    <div
      ref={rowRef}
      role='row'
      aria-rowindex={rowIndex}
      data-slot='record-table-range-error'
      className='flex h-12 min-w-(--record-table-min-width) border-b border-subtler'
    >
      {/* Sticky, so it stays in view when the table scrolls sideways. */}
      <div
        role='cell'
        aria-colspan={columns}
        className='sticky start-0 flex items-center gap-2'
      >
        <WarningIcon
          weight='bold'
          aria-hidden
          className='size-4 shrink-0 text-strong intent-danger'
        />
        <span className='min-w-0 flex-1 truncate'>
          {rangeErrorMessage(records)}
        </span>
        <Button
          size='sm'
          onClick={(event) => {
            // Retry unmounts this button; the table keeps focus, and its place.
            tableFocusTarget(event.currentTarget)?.focus({
              preventScroll: true
            })
            records.range?.retry()
          }}
        >
          Retry
        </Button>
      </div>
    </div>
  )
}
