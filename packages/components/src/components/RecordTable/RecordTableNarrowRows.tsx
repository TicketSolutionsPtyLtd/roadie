'use client'

import { type ReactNode, type RefObject, useCallback, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listSectionClass } from '../List/variants'
import { RecordCard } from '../Records/RecordCard'
import {
  RecordPlaceholder,
  RecordRangeError
} from '../Records/RecordPlaceholder'
import {
  VIRTUALISE_AFTER,
  type WindowPadding,
  recordsWindow
} from '../Records/recordsWindow'
import {
  type RowSize,
  cardGap,
  cardSize,
  listRowSize
} from '../Records/rowSizing'
import {
  useHeldHeight,
  useRangeWindow,
  useRowWindow
} from '../Records/rowWindow'
import { useKeepFocusInTable } from '../Records/tableFocus'
import type {
  RecordCardParts,
  RecordsRangeState,
  RecordsRow
} from '../Records/types'
import { RecordTableListRow } from './RecordTableListRow'
import type { RecordTableNarrowLayout } from './narrow'

type MeasureElement = (node: HTMLLIElement | null) => void

type NarrowShared = {
  parts: RecordCardParts
  layout: RecordTableNarrowLayout
  timeZone: string
  selecting: boolean
  /** Undefined when the records can't be selected. */
  isSelected?: (id: string) => boolean
  onToggle: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  getRowHref?: (row: object) => string | undefined
  /** List rows reach into the space beside the list; not in a box of their own. */
  bleed: boolean
}

type RecordTableNarrowRowsProps = NarrowShared & {
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

const sizing = ({ layout, parts }: NarrowShared): RowSize =>
  layout === 'cards' ? cardSize(parts.image !== undefined) : listRowSize(parts)

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
    <NarrowList {...listProps}>
      {rows.map((record, index) => (
        <NarrowRow
          key={record.id}
          shared={shared}
          record={record}
          posInSet={firstIndex === undefined ? undefined : firstIndex + index}
          setSize={setSize}
        />
      ))}
    </NarrowList>
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
        row={record.row}
        bleed={shared.bleed}
        posInSet={posInSet}
        setSize={setSize}
      />
    )
  return (
    <CardItem
      id={record.id}
      selected={props.selected}
      measureElement={measureElement}
      index={measureElement ? index : undefined}
      posInSet={posInSet}
      setSize={setSize}
    >
      <RecordCard {...props} row={record.row} />
    </CardItem>
  )
}

function CardItem({
  id,
  selected,
  measureElement,
  index,
  posInSet,
  setSize,
  children
}: {
  id: string
  selected?: boolean
  measureElement?: MeasureElement
  index?: number
  posInSet?: number
  setSize?: number
  children: ReactNode
}) {
  const itemRef = useRef<HTMLLIElement>(null)
  useKeepFocusInTable(itemRef)
  // Stable, so a render never re-measures the card.
  const mergedRef = useCallback(
    (node: HTMLLIElement | null) => {
      itemRef.current = node
      measureElement?.(node)
    },
    [measureElement]
  )
  return (
    <li
      ref={mergedRef}
      data-slot='record-table-card'
      data-row-id={id}
      data-selected={selected || undefined}
      data-index={index}
      aria-posinset={posInSet}
      aria-setsize={setSize}
    >
      {children}
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
  padding?: WindowPadding
  children: ReactNode
}

function NarrowList({
  caption,
  busy,
  cards,
  bodyRef,
  padding,
  children
}: ListProps) {
  return (
    <ul
      ref={bodyRef}
      // WebKit drops the list role from a list styled without markers.
      role='list'
      aria-label={caption}
      aria-busy={busy || undefined}
      data-slot='record-table-body'
      className={cn(
        cards ? ['grid', cardGap.gapClass] : [listSectionClass, joinSelected],
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
  const { bodyRef, view, measureElement } = useRowWindow<HTMLUListElement>({
    count: rows.length,
    getItemKey,
    ...sizing(shared)
  })
  useHeldHeight(bodyRef, measureElement !== undefined)
  const { cells, padding } = recordsWindow(view, { rows })
  return (
    <NarrowList {...listProps} bodyRef={bodyRef} padding={padding}>
      {cells.map(({ key, index, record }) => (
        <NarrowRow
          key={key}
          shared={shared}
          record={record!}
          posInSet={firstIndex + index}
          setSize={setSize ?? rows.length}
          measureElement={measureElement}
          index={index}
        />
      ))}
    </NarrowList>
  )
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
  const { bodyRef, view, measureElement } = useRangeWindow<HTMLUListElement>({
    range,
    row,
    onRow,
    ...sizing(shared)
  })
  useHeldHeight(bodyRef, measureElement !== undefined)
  const size = range.total ?? -1
  const { heightClass } = sizing(shared)
  const { cells, padding } = recordsWindow(view, { range })
  return (
    <NarrowList
      {...listProps}
      busy={listProps.busy || range.loading}
      bodyRef={bodyRef}
      padding={padding}
    >
      {cells.map(({ key, index, record, failed }) => {
        const measured = measureElement ? index : undefined
        if (failed === 'error')
          return (
            <RecordRangeError
              key={key}
              heightClass={heightClass}
              card={listProps.cards}
              banner={shared.parts.image !== undefined}
              posInSet={index + 1}
              setSize={size}
              index={measured}
              measureElement={measureElement}
            />
          )
        return record ? (
          <NarrowRow
            key={key}
            shared={shared}
            record={record}
            posInSet={index + 1}
            setSize={size}
            measureElement={measureElement}
            index={index}
          />
        ) : (
          <RecordPlaceholder
            key={key}
            parts={shared.parts}
            card={listProps.cards}
            index={measured}
            measureElement={measureElement}
            blank={failed === 'blank'}
          />
        )
      })}
    </NarrowList>
  )
}

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
      className={cn(
        'text-sm',
        cards ? ['grid', cardGap.gapClass] : listSectionClass
      )}
    >
      {Array.from({ length: Math.min(size, SKELETON_ROWS) }, (_, index) => (
        <RecordPlaceholder key={index} parts={parts} card={cards} />
      ))}
    </ul>
  )
}
