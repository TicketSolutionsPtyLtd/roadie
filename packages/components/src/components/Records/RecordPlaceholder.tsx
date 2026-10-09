'use client'

import { memo, useCallback, useRef } from 'react'

import { WarningIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Button } from '../Button'
import { listItemContentClass, listItemLeadingClass } from '../List/variants'
import { rangeErrorMessage } from './RecordsStates'
import { useRecordsContext } from './context'
import { cardSize, listRowSize } from './rowSizing'
import { tableFocusTarget, useKeepFocusInTable } from './tableFocus'
import type { RecordCardParts } from './types'

type MeasureElement = (node: HTMLLIElement | null) => void

/** A record still loading, at its list row's or card's size; static, as a shimmer would repaint each scroll frame. */
export const RecordPlaceholder = memo(function RecordPlaceholder({
  parts,
  card,
  index,
  measureElement,
  blank = false
}: {
  parts: RecordCardParts
  card: boolean
  index?: number
  measureElement?: MeasureElement
  /** No bars: a record of a failed range, which isn't loading. */
  blank?: boolean
}) {
  const description = parts.description !== undefined
  if (card) {
    const banner = parts.image !== undefined
    const bodyClass = cardSize(banner).heightClass
    return (
      <li
        ref={measureElement}
        aria-hidden
        data-index={index}
        data-slot='record-table-placeholder-row'
        data-card=''
      >
        <div
          className={cn(
            'grid content-start overflow-hidden rounded-xl border border-subtle',
            !banner && bodyClass
          )}
        >
          {banner && (
            <span
              data-slot='record-table-placeholder-media'
              className={cn('aspect-video', !blank && 'bg-subtle')}
            />
          )}
          <div
            className={cn('grid content-start gap-2 p-4', banner && bodyClass)}
          >
            {!blank && <span className='h-3.5 w-3/5 rounded-sm bg-subtle' />}
            {!blank && description && (
              <span className='h-2.5 w-2/5 rounded-sm bg-subtle' />
            )}
          </div>
        </div>
      </li>
    )
  }
  return (
    <li aria-hidden data-slot='record-table-placeholder-row'>
      <div className={cn('flex', listRowSize(parts).heightClass)}>
        {parts.leading && (
          <span className={cn(listItemLeadingClass, 'py-0')}>
            <span className={cn('size-10 rounded-md', !blank && 'bg-subtle')} />
          </span>
        )}
        {/* The list's own hairline, so placeholders divide like rows. */}
        <span
          data-slot='list-item-content'
          className={cn(listItemContentClass, 'grid content-center gap-2 py-0')}
        >
          {!blank && <span className='h-3 w-3/5 rounded-sm bg-subtle' />}
          {!blank && description && (
            <span className='h-2.5 w-2/5 rounded-sm bg-subtle' />
          )}
        </span>
      </div>
    </li>
  )
})

/** What a failed range shows: the error and Retry. */
export function RangeErrorMessage() {
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
          // Retry unmounts this button; the records keep focus, and their place.
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

/** A failed range in a list or cards, at a list row's or a card's size. */
export function RecordRangeError({
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
  measureElement?: MeasureElement
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
          <div
            className={cn(
              'flex items-center gap-2 p-4',
              cardSize(banner).heightClass
            )}
          >
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
