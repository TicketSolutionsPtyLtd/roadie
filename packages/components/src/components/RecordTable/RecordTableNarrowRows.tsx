'use client'

import {
  type ReactNode,
  type RefObject,
  memo,
  useCallback,
  useLayoutEffect
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listItemContentClass, listSectionClass } from '../List/variants'
import { RecordCard, hasBanner } from '../Records/RecordCard'
import type {
  RecordCardParts,
  RecordsRangeState,
  RecordsRow
} from '../Records/types'
import {
  RecordTableListRow,
  listRowHeightClass,
  listRowRem
} from './RecordTableListRow'
import {
  RecordTableNarrowRangeError,
  failedRowAt,
  rangeErrorKey
} from './RecordTableRangeError'
import {
  type RowSizing,
  VIRTUALISE_AFTER,
  indexKey,
  useRangeWindow,
  windowPadding
} from './RecordTableRows'
import type { RecordTableNarrowLayout } from './narrow'
import { useRowWindow } from './rowWindow'

/** A card's height before it's measured, in rem, and what a 16:9 banner adds on a phone. */
export const CARD_REM = 10
const BANNER_REM = 12.5
export const CARD_GAP_REM = 0.75

export const cardRem = (parts: RecordCardParts<never>) =>
  CARD_REM + (hasBanner(parts) ? BANNER_REM : 0)

type MeasureElement = (node: HTMLLIElement | null) => void

export type NarrowShared = {
  parts: RecordCardParts
  layout: RecordTableNarrowLayout
  timeZone: string
  selecting: boolean
  /** Undefined when the records can't be selected. */
  isSelected?: (id: string) => boolean
  onToggle: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  getRowHref?: (row: object) => string | undefined
}

export type RecordTableNarrowRowsProps = NarrowShared & {
  rows: readonly RecordsRow<object>[]
  caption?: string
  busy?: boolean
  /** One-based place of the first row, when the list holds only some of its records. */
  firstIndex?: number
  /** The whole list's length, when it holds only some of its records. */
  setSize?: number
  range?: RecordsRangeState
  row?: number
  onRow?: (row: number) => void
}

/** Cards size to their content, so the window measures them. */
const sizing = ({ layout, parts }: NarrowShared): RowSizing =>
  layout === 'cards'
    ? { measure: true, gapRem: CARD_GAP_REM, estimateRem: cardRem(parts) }
    : { estimateRem: listRowRem(parts) }

export function RecordTableNarrowRows({
  rows,
  caption,
  busy,
  firstIndex,
  setSize,
  range,
  row,
  onRow,
  ...shared
}: RecordTableNarrowRowsProps) {
  const listProps = { caption, busy, cards: shared.layout === 'cards' }
  if (range)
    return (
      <RangeList
        range={range}
        row={row ?? 0}
        onRow={onRow}
        shared={shared}
        {...listProps}
      />
    )
  if (rows.length > VIRTUALISE_AFTER)
    return (
      <VirtualList
        rows={rows}
        firstIndex={firstIndex}
        setSize={setSize}
        shared={shared}
        {...listProps}
      />
    )
  return (
    <List {...listProps}>
      {rows.map((record, index) => (
        <NarrowRow
          key={record.id}
          shared={shared}
          record={record}
          posInSet={firstIndex === undefined ? undefined : firstIndex + index}
          setSize={setSize}
        />
      ))}
    </List>
  )
}

function NarrowRow({
  shared,
  record,
  posInSet,
  setSize,
  measureElement,
  index
}: {
  shared: NarrowShared
  record: RecordsRow<object>
  posInSet?: number
  setSize?: number
  measureElement?: MeasureElement
  /** The window's index, when it measures its rows. */
  index?: number
}) {
  const props = {
    id: record.id,
    selected: shared.isSelected?.(record.id),
    selecting: shared.selecting,
    onToggle: shared.onToggle,
    rowActions: shared.rowActions,
    href: shared.getRowHref?.(record.row),
    timeZone: shared.timeZone,
    parts: shared.parts
  }
  if (shared.layout === 'list')
    return (
      <RecordTableListRow
        {...props}
        record={record.row}
        posInSet={posInSet}
        setSize={setSize}
      />
    )
  return (
    <li
      ref={measureElement}
      data-slot='record-table-card'
      data-row-id={record.id}
      data-selected={props.selected || undefined}
      data-index={measureElement ? index : undefined}
      aria-posinset={posInSet}
      aria-setsize={setSize}
    >
      <RecordCard {...props} row={record.row} />
    </li>
  )
}

// Selected neighbours read as one block: no corners or divider where they meet.
// :has() rows set variables the row reads, since a selector running past a
// :has() restyles every row on the page whenever anything changes.
const joinSelected = [
  '[&>li[data-selected]+li[data-selected]>div]:rounded-t-none',
  '[&>li[data-selected]:has(+li[data-selected])]:[--record-table-row-join:0px]',
  '[&>li[data-selected]>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:has(+li[data-selected])]:[--list-divider:transparent]'
].join(' ')

type ListProps = {
  caption?: string
  busy?: boolean
  cards: boolean
  bodyRef?: RefObject<HTMLUListElement | null>
  padding?: ReturnType<typeof windowPadding>
  children: ReactNode
}

function List({ caption, busy, cards, bodyRef, padding, children }: ListProps) {
  return (
    <ul
      ref={bodyRef}
      // WebKit drops the list role from a list styled without markers.
      role='list'
      aria-label={caption}
      aria-busy={busy || undefined}
      data-slot='record-table-body'
      className={cn(
        cards ? 'grid gap-3' : [listSectionClass, joinSelected],
        'text-sm'
      )}
      style={padding}
    >
      {children}
    </ul>
  )
}

function VirtualList({
  rows,
  firstIndex = 1,
  setSize,
  shared,
  ...listProps
}: {
  rows: readonly RecordsRow<object>[]
  firstIndex?: number
  setSize?: number
  shared: NarrowShared
  caption?: string
  busy?: boolean
  cards: boolean
}) {
  const getItemKey = useCallback((index: number) => rows[index]!.id, [rows])
  const { bodyRef, items, total, margin, measureElement } =
    useRowWindow<HTMLUListElement>({
      count: rows.length,
      getItemKey,
      ...sizing(shared)
    })
  useHeldHeight(bodyRef, measureElement !== undefined)
  return (
    <List
      {...listProps}
      bodyRef={bodyRef}
      padding={windowPadding(items, total, margin, !measureElement)}
    >
      {items.map((item) => (
        <NarrowRow
          key={rows[item.index]!.id}
          shared={shared}
          record={rows[item.index]!}
          posInSet={firstIndex + item.index}
          setSize={setSize ?? rows.length}
          measureElement={measureElement}
          index={item.index}
        />
      ))}
    </List>
  )
}

/**
 * Holds measured rows' body at its last committed height. React removes
 * swapped rows before inserting their replacements, and WebKit clamps the
 * scroll to the shorter body in between; fixed rows hold their total instead.
 */
function useHeldHeight(
  bodyRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body || !enabled) return
    body.style.minBlockSize = ''
    // Floored, so the hold never outgrows the rows.
    body.style.minBlockSize = `${Math.floor(body.getBoundingClientRect().height)}px`
  })
}

function RangeList({
  range,
  row,
  onRow,
  shared,
  ...listProps
}: {
  range: RecordsRangeState
  row: number
  onRow?: (row: number) => void
  shared: NarrowShared
  caption?: string
  busy?: boolean
  cards: boolean
}) {
  const { bodyRef, items, total, margin, measureElement, first } =
    useRangeWindow<HTMLUListElement>({
      range,
      row,
      onRow,
      ...sizing(shared)
    })
  useHeldHeight(bodyRef, measureElement !== undefined)
  const size = range.total ?? -1
  const heightClass = listRowHeightClass(shared.parts)
  return (
    <List
      {...listProps}
      busy={listProps.busy || range.loading}
      bodyRef={bodyRef}
      padding={windowPadding(items, total, margin, !measureElement)}
    >
      {items.map((item) => {
        // With the query too, so a new search's row starts fresh.
        const key = `${range.key}${indexKey(item.index)}`
        const held = range.rowAt(item.index)
        const failed = held ? undefined : failedRowAt(range, item.index, first)
        const measured = measureElement ? item.index : undefined
        if (failed?.error)
          return (
            <RecordTableNarrowRangeError
              key={rangeErrorKey(failed.start)}
              heightClass={heightClass}
              card={listProps.cards}
              index={measured}
              measureElement={measureElement}
            />
          )
        return held ? (
          // By index: a shifting offset API can return one id twice.
          <NarrowRow
            key={key}
            shared={shared}
            record={held}
            posInSet={item.index + 1}
            setSize={size}
            measureElement={measureElement}
            index={item.index}
          />
        ) : (
          <NarrowPlaceholder
            key={key}
            parts={shared.parts}
            card={listProps.cards}
            index={measured}
            measureElement={measureElement}
            blank={failed !== undefined}
          />
        )
      })}
    </List>
  )
}

/** A record still loading, at its row's or card's size; static, as a shimmer would repaint each scroll frame. */
export const NarrowPlaceholder = memo(function NarrowPlaceholder({
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
    const banner = hasBanner(parts)
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
            !banner && 'h-40'
          )}
        >
          {banner && (
            <span
              data-slot='record-table-placeholder-media'
              className={cn('aspect-video', !blank && 'bg-subtle')}
            />
          )}
          <div className={cn('grid content-start gap-2 p-4', banner && 'h-40')}>
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
      <div className={cn('flex', listRowHeightClass(parts))}>
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

const SKELETON_ROWS = 8

/** Placeholders in place of the records while the first ones load. */
export function NarrowSkeleton({
  parts,
  layout,
  size
}: {
  parts: RecordCardParts
  layout: RecordTableNarrowLayout
  size: number
}) {
  const cards = layout === 'cards'
  return (
    <ul
      aria-hidden
      data-slot='record-table-skeleton'
      className={cn('text-sm', cards ? 'grid gap-3' : listSectionClass)}
    >
      {Array.from({ length: Math.min(size, SKELETON_ROWS) }, (_, index) => (
        <NarrowPlaceholder key={index} parts={parts} card={cards} />
      ))}
    </ul>
  )
}
