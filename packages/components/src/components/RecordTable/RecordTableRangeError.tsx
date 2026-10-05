'use client'

import { useCallback, useRef } from 'react'

import { WarningIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Button } from '../Button'
import { listItemContentClass } from '../List/variants'
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

/** What a failed range shows: the error and Retry. */
function RangeErrorMessage() {
  const { records } = useRecordsContext()
  return (
    <>
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
          // The app's own recovery runs too, as from the error state.
          records.onRetry?.()
        }}
      >
        Retry
      </Button>
    </>
  )
}

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
      className='flex h-12 min-w-(--record-table-min-width) border-b border-subtler'
    >
      {/* Sticky, so it stays in view when the table scrolls sideways. */}
      <div
        role='cell'
        aria-colspan={columns}
        className='sticky start-0 flex items-center gap-2 ps-(--content-inset)'
      >
        <RangeErrorMessage />
      </div>
    </div>
  )
}

/** A failed range in narrow rows, at a list row's or a card's size. */
export function RecordTableNarrowRangeError({
  heightClass,
  card,
  banner = false,
  posInSet,
  setSize,
  index,
  measureElement
}: {
  /** The list row's height, matching its placeholders. */
  heightClass?: string
  card: boolean
  /** A card's banner above the message, matching its placeholder. */
  banner?: boolean
  /** One-based place in the whole list, and the list's length or -1 while unknown. */
  posInSet: number
  setSize: number
  index?: number
  measureElement?: (node: HTMLLIElement | null) => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  useKeepFocusInTable(ref)
  // Stable, so a render never re-measures the card.
  const mergedRef = useCallback(
    (node: HTMLLIElement | null) => {
      ref.current = node
      measureElement?.(node)
    },
    [measureElement]
  )
  return (
    <li
      ref={mergedRef}
      data-index={index}
      data-slot='record-table-range-error'
      aria-posinset={posInSet}
      aria-setsize={setSize}
    >
      {card ? (
        // The placeholder's structure, banner too, so the measured list doesn't jump.
        <div className='grid overflow-hidden rounded-xl border border-subtle'>
          {banner && (
            <span
              data-slot='record-table-placeholder-media'
              className='aspect-video'
            />
          )}
          <div className='flex h-40 items-center gap-2 p-4'>
            <RangeErrorMessage />
          </div>
        </div>
      ) : (
        <div className={cn('flex', heightClass)}>
          <span className={cn(listItemContentClass, 'gap-2 py-0')}>
            <RangeErrorMessage />
          </span>
        </div>
      )}
    </li>
  )
}
