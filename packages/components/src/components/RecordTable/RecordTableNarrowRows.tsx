'use client'

import {
  type ReactNode,
  type RefObject,
  useCallback,
  useId,
  useMemo,
  useRef
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { surfaceClass, useSurface } from '../../utils/surface'
import {
  listGroupSectionClass,
  listGroupTitleVariants,
  listGroupVariants,
  listSectionClass
} from '../List/variants'
import { RecordCard } from '../Records/RecordCard'
import {
  RecordPlaceholder,
  RecordRangeError
} from '../Records/RecordPlaceholder'
import type { RecordGroup } from '../Records/groups'
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
import { ListPlaceContext } from './RecordTableRowPlace'
import type { RecordTableNarrowLayout } from './narrow'

type MeasureElement = (node: HTMLLIElement | null) => void

type NarrowShared = {
  parts: RecordCardParts
  layout: RecordTableNarrowLayout
  timeZone: string
  selecting: boolean
  /** Undefined when the records can't be selected. */
  isSelected?: (id: string) => boolean
  /** `order` is the on-screen order a range follows, when it isn't the rows'. */
  onToggle: (id: string, range: boolean, order?: readonly string[]) => void
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
  /** Rows under a title and count per group, in place of `rows`. Groups with no rows are left out. */
  groups?: readonly RecordGroup[]
  /** Group titles stick at this `top` as their rows scroll by. */
  stickyTop?: string
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
  groups,
  stickyTop,
  ...shared
}: RecordTableNarrowRowsProps) {
  const listProps = { caption, busy, cards: shared.layout === 'cards' }
  if (groups)
    return (
      <GroupedList
        groups={groups}
        stickyTop={stickyTop}
        shared={shared}
        {...listProps}
      />
    )
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
      <ListPlaceContext value={{ posInSet, setSize }}>
        <RecordTableListRow {...props} row={record.row} bleed={shared.bleed} />
      </ListPlaceContext>
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
  '[&>li[data-selected]:has(+li[data-selected])]:[--record-table-row-end-radius:0px]',
  '[&>li[data-selected]>*>[data-slot=list-item-content]]:after:bg-transparent',
  '[&>li:has(+li[data-selected])]:[--list-divider:transparent]'
].join(' ')

const noList = { current: null }

// Unwindowed: grouping applies to the rows loaded, a page at most.
function GroupedList({
  groups,
  stickyTop,
  shared,
  ...listProps
}: {
  groups: readonly RecordGroup[]
  stickyTop?: string
  shared: NarrowShared
  caption?: string
  busy?: boolean
  cards: boolean
}) {
  const { shown, order } = useMemo(() => {
    const shown = groups.filter((group) => group.rows.length > 0)
    const order = shown.flatMap((group) => group.rows.map(({ id }) => id))
    return { shown, order }
  }, [groups])
  const { onToggle } = shared
  const toggle = useCallback(
    (id: string, range: boolean) => onToggle(id, range, order),
    [onToggle, order]
  )
  const grouped = { ...shared, onToggle: toggle }
  const listRef = useRef<HTMLUListElement>(null)
  useSurface(stickyTop === undefined ? noList : listRef)
  return (
    <NarrowList {...listProps} bodyRef={listRef} grouped>
      {shown.map((group) => (
        <Group
          key={group.key ?? ''}
          group={group}
          stickyTop={stickyTop}
          shared={grouped}
        />
      ))}
    </NarrowList>
  )
}

function Group({
  group,
  stickyTop,
  shared
}: {
  group: RecordGroup
  stickyTop?: string
  shared: NarrowShared
}) {
  const titleId = useId()
  return (
    <li data-slot='list-group' className={listGroupVariants()}>
      <h2
        id={titleId}
        data-slot='list-group-title'
        className={cn(
          listGroupTitleVariants(),
          'flex gap-1.5',
          shared.bleed && '-mx-3',
          stickyTop !== undefined && ['sticky z-1 py-1', surfaceClass]
        )}
        style={stickyTop === undefined ? undefined : { top: stickyTop }}
      >
        {group.label}{' '}
        <span className='font-normal tabular-nums'>{group.rows.length}</span>
      </h2>
      <ul
        role='list'
        aria-labelledby={titleId}
        data-slot='list-section'
        className={cn(listSectionClass, listGroupSectionClass, joinSelected)}
      >
        {group.rows.map((record) => (
          <NarrowRow key={record.id} shared={shared} record={record} />
        ))}
      </ul>
    </li>
  )
}

type ListProps = {
  caption?: string
  busy?: boolean
  cards: boolean
  bodyRef?: RefObject<HTMLUListElement | null>
  padding?: WindowPadding
  /** Holds groups, each with its own section of rows. */
  grouped?: boolean
  children: ReactNode
}

function NarrowList({
  caption,
  busy,
  cards,
  bodyRef,
  padding,
  grouped = false,
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
        grouped
          ? 'grid [&>li:first-child]:mt-0'
          : cards
            ? ['grid', cardGap.gapClass]
            : [listSectionClass, joinSelected],
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
