'use client'

import {
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RecordCard } from '../Records/RecordCard'
import {
  type GroupLeaf,
  RecordGroupSection,
  groupedBodyClass,
  useRecordGroups
} from '../Records/RecordGroupSection'
import {
  RecordPlaceholder,
  RecordRangeError
} from '../Records/RecordPlaceholder'
import { groupFields } from '../Records/groupBy'
import { type RecordGroup, groupRecordsBy } from '../Records/groups'
import type { RecordsContentProps } from '../Records/layouts'
import { type WindowPadding, recordsWindow } from '../Records/recordsWindow'
import { gridGap, gridRowSize } from '../Records/rowSizing'
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
import {
  RecordsLayoutFrame,
  RecordsLayoutState,
  useRecordsLayout
} from '../Records/useRecordsLayout'
import { useSelectModeLayout } from '../Records/useSelectModeLayout'
import { gridParts } from './parts'
import type { GridLayoutConfig } from './types'
import {
  FIRST_CARDS,
  GridFiller,
  UNMEASURED_CLASS,
  firstCards
} from './unmeasured'

const columnsClass = cn(
  'grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))]',
  gridGap.gapClass
)
// A card is at most just under two of its narrowest, or a phone's width.
const IMAGE_SIZES = '(max-width: 40rem) 100vw, 32rem'
const SKELETON_CARDS = 8

export type RecordGridContentProps = RecordsContentProps & {
  config: GridLayoutConfig
}

type GridShared = {
  parts: RecordCardParts
  timeZone: string
  selecting: boolean
  /** Undefined when the records can't be selected. */
  isSelected?: (id: string) => boolean
  /** `order` is the on-screen order a range follows, when it isn't the rows'. */
  onToggle: (id: string, range: boolean, order?: readonly string[]) => void
  rowActions?: (row: object) => ReactNode
  getRowHref?: (row: object) => string | undefined
}

/** A windowed card's grid row. Every card carries it, as a card can stop leading its row while still observed; only the first takes the window's ref. Any card measures its row, as each stretches to the row's height. */
type Measure = {
  index: number
  ref?: (node: HTMLLIElement | null) => void
}

export function RecordGridContent({
  className,
  maxHeight,
  fill = false,
  config
}: RecordGridContentProps) {
  const frame = useRecordsLayout({ fill, maxHeight })
  const { records, caption, state, windowed, firstIndex, partial } = frame
  const { fields, view } = records
  const parts = useMemo(
    () => gridParts(config, fields, view.layout),
    [config, fields, view.layout]
  )
  const grouping = useMemo(
    () => groupFields(fields, view.layout),
    [fields, view.layout]
  )
  // A range grid loads cards as they scroll into view, so it stays ungrouped
  // until groups can come from the server.
  const { rows, range } = records
  const groups = useMemo(
    () =>
      grouping.length > 0 && !range
        ? groupRecordsBy(rows, grouping)
        : undefined,
    [grouping, range, rows]
  )
  // Cards have no checkboxes, so the grid selects only through Select mode.
  const selecting = useSelectModeLayout(true)
  const shared: GridShared = {
    parts,
    timeZone: records.timeZone,
    selecting,
    isSelected: frame.isSelected,
    onToggle: frame.toggleRow,
    rowActions: frame.rowActions,
    getRowHref: records.getRowHref
  }

  const listProps = { caption, busy: frame.busy }

  const body =
    state === 'loading' ? (
      <GridSkeleton parts={parts} size={records.position.pageSize} />
    ) : state ? (
      <RecordsLayoutState key={state} kind={state} records={records} />
    ) : groups ? (
      <GroupedGrid groups={groups} shared={shared} {...listProps} />
    ) : range ? (
      <RangeGrid
        range={range}
        row={records.position.row}
        onRow={records.setRow}
        shared={shared}
        {...listProps}
      />
    ) : windowed === 'rows' ? (
      <VirtualGrid
        rows={rows}
        firstIndex={firstIndex}
        setSize={records.pageCount > 1 ? records.resultCount : rows.length}
        shared={shared}
        {...listProps}
      />
    ) : (
      <GridList {...listProps}>
        {rows.map((record, index) => (
          <GridCard
            key={record.id}
            shared={shared}
            record={record}
            posInSet={partial ? firstIndex + index : undefined}
            setSize={partial ? records.resultCount : undefined}
          />
        ))}
      </GridList>
    )

  return (
    <RecordsLayoutFrame
      frame={frame}
      slot='record-grid'
      fill={fill}
      maxHeight={maxHeight}
      className={className}
    >
      {body}
    </RecordsLayoutFrame>
  )
}
RecordGridContent.displayName = 'RecordGridContent'

function GridSkeleton({
  parts,
  size
}: {
  parts: RecordCardParts
  size: number
}) {
  return (
    <ul
      aria-hidden
      data-slot='record-grid-skeleton'
      className={cn(columnsClass, 'text-sm')}
    >
      {Array.from({ length: Math.min(size, SKELETON_CARDS) }, (_, index) => (
        <RecordPlaceholder key={index} parts={parts} card />
      ))}
    </ul>
  )
}

type ListProps = {
  caption?: string
  busy?: boolean
  bodyRef?: Ref<HTMLUListElement>
  padding?: WindowPadding
  /** Before the columns are measured, when the grid answers to its own width. */
  unmeasured?: boolean
  children: ReactNode
}

function GridList({
  caption,
  busy,
  bodyRef,
  padding,
  unmeasured,
  children
}: ListProps) {
  return (
    <ul
      ref={bodyRef}
      // WebKit drops the list role from a list styled without markers.
      role='list'
      aria-label={caption}
      aria-busy={busy || undefined}
      data-slot='record-grid-body'
      className={cn(columnsClass, 'text-sm', unmeasured && UNMEASURED_CLASS)}
      style={padding}
    >
      {children}
    </ul>
  )
}

// Unwindowed, as a grouped list is: grouping applies to a page at most.
function GroupedGrid({
  groups,
  shared,
  caption,
  busy
}: {
  groups: readonly RecordGroup[]
  shared: GridShared
  caption?: string
  busy?: boolean
}) {
  const { shown, collapse, onToggle } = useRecordGroups(groups, shared.onToggle)
  const grouped = { ...shared, onToggle }
  const leaf: GroupLeaf = (group, titleId) => (
    <ul role='list' aria-labelledby={titleId} className={columnsClass}>
      {group.rows.map((record) => (
        <GridCard key={record.id} shared={grouped} record={record} />
      ))}
    </ul>
  )
  return (
    <ul
      role='list'
      aria-label={caption}
      aria-busy={busy || undefined}
      data-slot='record-grid-body'
      className={cn(groupedBodyClass(true), 'text-sm')}
    >
      {shown.map((group) => (
        <RecordGroupSection
          key={group.key ?? ''}
          group={group}
          leaf={leaf}
          collapse={collapse}
          headings
          outerRing
        />
      ))}
    </ul>
  )
}

function GridCard({
  shared,
  record,
  posInSet,
  setSize,
  measure
}: {
  shared: GridShared
  record: RecordsRow<object>
  posInSet?: number
  setSize?: number
  /** Its windowed row. */
  measure?: Measure
}) {
  const itemRef = useRef<HTMLLIElement>(null)
  useKeepFocusInTable(itemRef)
  const measureRef = measure?.ref
  // Stable, so a render never re-measures the card.
  const ref = useCallback(
    (node: HTMLLIElement | null) => {
      itemRef.current = node
      measureRef?.(node)
    },
    [measureRef]
  )
  const selected = shared.isSelected?.(record.id)
  return (
    <li
      ref={ref}
      data-slot='record-grid-card'
      data-row-id={record.id}
      data-selected={selected || undefined}
      data-index={measure?.index}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      // Stretched to its row, so each row's cards line up.
      className='grid'
    >
      <RecordCard
        id={record.id}
        row={record.row}
        parts={shared.parts}
        timeZone={shared.timeZone}
        href={shared.getRowHref?.(record.row)}
        selected={selected}
        selecting={shared.selecting}
        onToggle={shared.onToggle}
        rowActions={shared.rowActions}
        imageSizes={IMAGE_SIZES}
        className='content-start'
      />
    </li>
  )
}

/**
 * How many columns the grid lays out, read from its computed tracks so CSS
 * alone decides them. Undefined until it has: never a guess, as a count too
 * low sizes the whole window wrong.
 */
function useColumnCount(bodyRef: RefObject<HTMLElement | null>) {
  const [grid, setGrid] = useState<{ columns: number; rowRem?: number }>()
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const read = () => {
      const tracks = getComputedStyle(body)
        // Resolved px tracks only: a box not laid out reports the declared repeat().
        .gridTemplateColumns.split(' ')
        .filter((track) => track.endsWith('px')).length
      // A card as drawn is the best estimate of the rows not drawn yet.
      const card = body.querySelector('[data-slot="record-grid-card"]')
      const root = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      const height = card?.getBoundingClientRect().height ?? 0
      // Kept once read: later cards, scrolled to or resized, would only re-estimate.
      setGrid((now) => {
        const columns = Math.max(1, tracks)
        const rowRem =
          now?.rowRem ?? (height > 0 && root > 0 ? height / root : undefined)
        return now?.columns === columns && now.rowRem === rowRem
          ? now
          : { columns, rowRem }
      })
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(body)
    return () => observer.disconnect()
  }, [bodyRef])
  return grid
}

function VirtualGrid({
  rows,
  firstIndex,
  setSize,
  shared,
  ...listProps
}: {
  rows: readonly RecordsRow<object>[]
  firstIndex: number
  setSize: number
  shared: GridShared
  caption?: string
  busy?: boolean
}) {
  const columnsRef = useRef<HTMLUListElement>(null)
  const measured = useColumnCount(columnsRef)
  const columns = measured?.columns ?? 1
  const size = gridRowSize(shared.parts.image !== undefined)
  const getItemKey = useCallback(
    // With the count too, so heights measured at another width start over.
    (row: number) => `${columns}:${rows[row * columns]!.id}`,
    [rows, columns]
  )
  const { bodyRef, view, measureElement } = useRowWindow<HTMLUListElement>({
    count: Math.ceil(rows.length / columns),
    getItemKey,
    ...size,
    estimateRem: measured?.rowRem ?? size.estimateRem
  })
  useHeldHeight(bodyRef, true)
  const setRefs = useBodyRef(bodyRef, columnsRef)
  const { cells, padding } = recordsWindow(view, { rows, columns })
  // On the server and until the layout effect reads the tracks: the first cards,
  // and the room for the rest at whatever width CSS lays out.
  if (measured === undefined)
    return (
      <GridList {...listProps} bodyRef={setRefs} unmeasured>
        {rows.slice(0, FIRST_CARDS).map((record, index) => (
          <GridCard
            key={record.id}
            shared={shared}
            record={record}
            posInSet={firstIndex + index}
            setSize={setSize}
          />
        ))}
        <GridFiller records={rows.length} />
      </GridList>
    )
  return (
    <GridList {...listProps} bodyRef={setRefs} padding={padding}>
      {cells.map(({ key, index, row, leads, record }) => (
        <GridCard
          key={key}
          shared={shared}
          record={record!}
          posInSet={firstIndex + index}
          setSize={setSize}
          measure={{ index: row, ref: leads ? measureElement : undefined }}
        />
      ))}
      {/* The slot the filler held, so the cards stay mounted when it goes. */}
      {null}
    </GridList>
  )
}

/**
 * Range mode by grid row: the window counts rows of cards, and asks for and
 * reports records at each row's first index.
 */
function RangeGrid({
  range,
  row,
  onRow,
  shared,
  ...listProps
}: {
  range: RecordsRangeState
  row: number
  onRow?: (row: number) => void
  shared: GridShared
  caption?: string
  busy?: boolean
}) {
  const columnsRef = useRef<HTMLUListElement>(null)
  const measured = useColumnCount(columnsRef)
  const columns = measured?.columns ?? 1
  const byRow = useGridRange(range, columns)
  const reportRow = useCallback(
    (gridRow: number) => onRow?.(gridRow * columns),
    [onRow, columns]
  )
  const { bodyRef, view, measureElement } = useRangeWindow<HTMLUListElement>({
    range: byRow,
    row: Math.floor(row / columns),
    onRow: reportRow,
    ...gridRowSize(shared.parts.image !== undefined)
  })
  useHeldHeight(bodyRef, true)
  const setRefs = useBodyRef(bodyRef, columnsRef)
  const size = range.total ?? -1
  // Cells keyed by each new column count too: a card leading a row at both
  // counts would keep its measuring ref, and its new row would never be
  // measured. Not by the first count read, so the cards first painted stay.
  const key = `${range.key}:${useLayoutGeneration(measured?.columns)}`
  const { cells, padding } = recordsWindow(view, {
    range: { ...range, key },
    columns
  })
  const busy = listProps.busy || range.loading
  // On the server and until the layout effect reads the tracks, as VirtualGrid:
  // the first cards, and the room for the rest at whatever width CSS lays out.
  if (measured === undefined) {
    const first = firstCards(range.count)
    return (
      <GridList {...listProps} busy={busy} bodyRef={setRefs} unmeasured>
        {Array.from({ length: first }, (_, index) => {
          const record = range.rowAt(index)
          return record ? (
            <GridCard
              key={`${key}@${index}`}
              shared={shared}
              record={record}
              posInSet={index + 1}
              setSize={size}
            />
          ) : (
            <RecordPlaceholder
              key={`${key}@${index}`}
              parts={shared.parts}
              card
            />
          )
        })}
        {range.count > first && <GridFiller records={range.count} />}
      </GridList>
    )
  }
  return (
    <GridList {...listProps} busy={busy} bodyRef={setRefs} padding={padding}>
      {cells.map(({ key, index, row: gridRow, leads, record, failed }) => {
        const measure = {
          index: gridRow,
          ref: leads ? measureElement : undefined
        }
        if (failed === 'error')
          return (
            <RecordRangeError
              key={key}
              card
              banner={shared.parts.image !== undefined}
              posInSet={index + 1}
              setSize={size}
              index={measure.index}
              measureElement={measure.ref}
            />
          )
        return record ? (
          <GridCard
            key={key}
            shared={shared}
            record={record}
            posInSet={index + 1}
            setSize={size}
            measure={measure}
          />
        ) : (
          <RecordPlaceholder
            key={key}
            parts={shared.parts}
            card
            index={measure.index}
            measureElement={measure.ref}
            blank={failed === 'blank'}
          />
        )
      })}
      {/* The slot the filler held, so the cards stay mounted when it goes. */}
      {null}
    </GridList>
  )
}

/**
 * Range state counted in grid rows, each standing for its records. `show`
 * keeps its identity, as the window holds the first one it gets.
 */
function useGridRange(
  range: RecordsRangeState,
  columns: number
): RecordsRangeState {
  const latest = useRef({ range, columns })
  useLayoutEffect(() => {
    latest.current = { range, columns }
  })
  const show = useCallback((first: number, last: number, target?: number) => {
    const { range: current, columns: across } = latest.current
    current.show(
      first * across,
      Math.min((last + 1) * across, Math.max(current.count, 1)) - 1,
      target === undefined ? undefined : target * across
    )
  }, [])
  const { rowAt: recordAt } = range
  const rowAt = useCallback(
    (row: number) => recordAt(row * columns),
    [recordAt, columns]
  )
  const count = Math.ceil(range.count / columns)
  const total =
    range.total === undefined ? undefined : Math.ceil(range.total / columns)
  return useMemo(
    // Keyed by the count too, so a new width forgets the rows reported and
    // measured at the old one and scrolls the position's record back in.
    () => ({
      ...range,
      key: `${range.key}:${columns}`,
      count,
      total,
      rowAt,
      show
    }),
    [range, columns, count, total, rowAt, show]
  )
}

/** Counts the column counts read after the first, which starts at 0. */
function useLayoutGeneration(columns: number | undefined) {
  const [seen, setSeen] = useState({ columns, generation: 0 })
  if (columns !== undefined && columns !== seen.columns)
    setSeen({
      columns,
      generation: seen.columns === undefined ? 0 : seen.generation + 1
    })
  return seen.generation
}

/** The window's body ref and the column count's, on one list. */
function useBodyRef(
  bodyRef: RefObject<HTMLUListElement | null>,
  columnsRef: RefObject<HTMLUListElement | null>
) {
  return useCallback(
    (node: HTMLUListElement | null) => {
      bodyRef.current = node
      columnsRef.current = node
    },
    [bodyRef, columnsRef]
  )
}
