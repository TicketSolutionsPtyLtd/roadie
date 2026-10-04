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

import { Progress } from '../Progress'
import {
  NarrowPlaceholder,
  useHeldHeight
} from '../RecordTable/RecordTableNarrowRows'
import {
  RecordTableNarrowRangeError,
  failedRowAt,
  rangeErrorKey
} from '../RecordTable/RecordTableRangeError'
import {
  VIRTUALISE_AFTER,
  indexKey,
  useRangeWindow,
  windowPadding
} from '../RecordTable/RecordTableRows'
import { useRowWindow } from '../RecordTable/rowWindow'
import { useKeepFocusInTable } from '../RecordTable/tableFocus'
import { RecordCard } from '../Records/RecordCard'
import { RecordsEmpty, RecordsError } from '../Records/RecordsStates'
import { useRecordsContext } from '../Records/context'
import type { RecordsContentProps } from '../Records/layouts'
import { leaveSelectOnEscape } from '../Records/selectMode'
import { useStickyTop } from '../Records/stickyTop'
import type {
  RecordCardParts,
  RecordsRangeState,
  RecordsRow
} from '../Records/types'
import { useSurvivor } from '../Records/useBulkActions'
import { useSelectModeLayout } from '../Records/useSelectModeLayout'
import { ScrollArea } from '../ScrollArea'
import { gridParts } from './parts'
import type { GridLayoutConfig } from './types'

/** Rem between cards, both ways. */
// Keep in step with columnsClass's gap-4.
const GRID_GAP_REM = 1
/** A card's height before it's measured, in rem, and what its banner adds at the narrowest. */
const CARD_REM = 10
const BANNER_REM = 9
const columnsClass =
  'grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-4'
// A card is at most just under two of its narrowest, or a phone's width.
const IMAGE_SIZES = '(max-width: 40rem) 100vw, 32rem'
const SKELETON_CARDS = 8

const estimateRem = (parts: RecordCardParts) =>
  CARD_REM + (parts.image ? BANNER_REM : 0)

export type RecordGridContentProps = RecordsContentProps & {
  config: GridLayoutConfig
}

type GridShared = {
  parts: RecordCardParts
  timeZone: string
  selecting: boolean
  /** Undefined when the records can't be selected. */
  isSelected?: (id: string) => boolean
  onToggle: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  getRowHref?: (row: object) => string | undefined
}

/** A windowed card's grid row. Every card carries it, as a card can stop leading its row while still observed; only the first takes the window's ref. */
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
  const { records, caption, toolbar, setContentFill } = useRecordsContext()
  const rowsSurvivor = useSurvivor('rows')
  const frameRef = useRef<HTMLDivElement>(null)
  const boxed = fill || Boolean(maxHeight)
  const progressTop = useStickyTop(frameRef, toolbar, boxed)
  const { fields, view } = records
  const parts = useMemo(
    () => gridParts(config, fields, view.layout),
    [config, fields, view.layout]
  )
  useLayoutEffect(() => {
    setContentFill(fill)
    return () => setContentFill(false)
  }, [fill, setContentFill])

  // Cards have no checkboxes, so the grid selects only through Select mode.
  const selecting = useSelectModeLayout(true)
  const latest = useRef(records)
  useLayoutEffect(() => {
    latest.current = records
  })

  // Stable, so a selection change or an inline rowActions leaves other cards alone.
  const toggleRow = useCallback(
    (id: string, range: boolean) => latest.current.toggleRow(id, { range }),
    []
  )
  const rowActions = useCallback(
    (row: object) => latest.current.rowActions?.(row),
    []
  )
  const shared: GridShared = {
    parts,
    timeZone: records.timeZone,
    selecting,
    isSelected: records.selectable ? records.isSelected : undefined,
    onToggle: toggleRow,
    rowActions: records.rowActions ? rowActions : undefined,
    getRowHref: records.getRowHref
  }

  const { rows, range } = records
  const busy = records.loading && !records.error
  // Range mode keeps its cards bright: placeholders already show what loads.
  const dimmed = busy && !range && rows.length > 0
  const awaitingRows = busy && !range && rows.length === 0
  const empty = range ? range.count === 0 : rows.length === 0
  const shownPage = Math.min(records.position.page, records.pageCount - 1)
  const partial = rows.length > VIRTUALISE_AFTER || records.pageCount > 1
  const listProps = { caption, busy }

  // Keyed, so one state replacing another hands its button's focus on.
  const body = records.error ? (
    <GridState key='error'>
      <RecordsError records={records} />
    </GridState>
  ) : awaitingRows ? (
    <GridSkeleton parts={parts} size={records.position.pageSize} />
  ) : empty ? (
    <GridState key='empty'>
      <RecordsEmpty records={records} />
    </GridState>
  ) : range ? (
    <RangeGrid
      range={range}
      row={records.position.row}
      onRow={records.setRow}
      shared={shared}
      {...listProps}
    />
  ) : rows.length > VIRTUALISE_AFTER ? (
    <VirtualGrid
      rows={rows}
      firstIndex={shownPage * records.position.pageSize + 1}
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
          posInSet={
            partial
              ? shownPage * records.position.pageSize + index + 1
              : undefined
          }
          setSize={partial ? records.resultCount : undefined}
        />
      ))}
    </GridList>
  )

  const content = (
    <div
      ref={frameRef}
      data-slot='record-grid'
      data-records-content=''
      onKeyDown={leaveSelectOnEscape(records)}
      className={cn('w-full', !boxed && className)}
    >
      {dimmed && (
        // Zero height, so the cards don't move; sticks under the toolbar.
        <div
          aria-hidden
          data-slot='record-grid-progress'
          style={{ top: progressTop }}
          className='pointer-events-none sticky z-docked h-0'
        >
          <div className='absolute inset-x-0 top-0'>
            <Progress value={null}>
              <Progress.Track className='h-0.5 rounded-none bg-transparent'>
                <Progress.Indicator />
              </Progress.Track>
            </Progress>
          </div>
        </div>
      )}
      <div
        data-slot='record-grid-scroller'
        {...rowsSurvivor}
        tabIndex={-1}
        className={cn('isolate outline-none', dimmed && 'opacity-60')}
      >
        {body}
      </div>
    </div>
  )
  if (!boxed) return content
  return (
    <ScrollArea
      data-slot='record-grid-box'
      data-pane-fill={fill || undefined}
      // basis-0, not flex-1: a percentage basis in a column of unknown height falls back to content.
      className={cn(fill && 'h-full min-h-0 grow basis-0', className)}
    >
      <ScrollArea.Viewport
        data-slot='record-grid-viewport'
        role='region'
        aria-label={`${caption ?? 'Records'}, scrolls`}
        style={fill ? undefined : { maxHeight }}
      >
        {content}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar keepMounted>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}
RecordGridContent.displayName = 'RecordGridContent'

/** A state in place of the cards, keeping focus with the records when its button goes. */
function GridState({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useKeepFocusInTable(ref)
  return <div ref={ref}>{children}</div>
}

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
        <NarrowPlaceholder key={index} parts={parts} card />
      ))}
    </ul>
  )
}

type ListProps = {
  caption?: string
  busy?: boolean
  bodyRef?: Ref<HTMLUListElement>
  padding?: ReturnType<typeof windowPadding>
  children: ReactNode
}

function GridList({ caption, busy, bodyRef, padding, children }: ListProps) {
  return (
    <ul
      ref={bodyRef}
      // WebKit drops the list role from a list styled without markers.
      role='list'
      aria-label={caption}
      aria-busy={busy || undefined}
      data-slot='record-grid-body'
      className={cn(columnsClass, 'text-sm')}
      style={padding}
    >
      {children}
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

/** How many columns the grid lays out, read from its computed tracks so CSS alone decides them. */
function useColumnCount(bodyRef: RefObject<HTMLElement | null>) {
  const [columns, setColumns] = useState(1)
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const read = () => {
      const tracks = getComputedStyle(body)
        // Resolved px tracks only: a box not laid out reports the declared repeat().
        .gridTemplateColumns.split(' ')
        .filter((track) => track.endsWith('px')).length
      setColumns(Math.max(1, tracks))
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(body)
    return () => observer.disconnect()
  }, [bodyRef])
  return columns
}

/** The windowed rows' cards, in order: each row's first one is measured. */
function rowSpans(
  items: readonly { index: number }[],
  columns: number,
  count: number
) {
  return items.flatMap(({ index: row }) =>
    Array.from(
      { length: Math.max(0, Math.min(columns, count - row * columns)) },
      (_, offset) => ({
        row,
        index: row * columns + offset,
        first: offset === 0
      })
    )
  )
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
  const columns = useColumnCount(columnsRef)
  const getItemKey = useCallback(
    // With the count too, so heights measured at another width start over.
    (row: number) => `${columns}:${rows[row * columns]!.id}`,
    [rows, columns]
  )
  const { bodyRef, items, total, margin, measureElement } =
    useRowWindow<HTMLUListElement>({
      count: Math.ceil(rows.length / columns),
      getItemKey,
      measure: true,
      gapRem: GRID_GAP_REM,
      estimateRem: estimateRem(shared.parts)
    })
  useHeldHeight(bodyRef, true)
  const setRefs = useBodyRef(bodyRef, columnsRef)
  return (
    <GridList
      {...listProps}
      bodyRef={setRefs}
      padding={windowPadding(items, total, margin, false)}
    >
      {rowSpans(items, columns, rows.length).map(({ row, index, first }) => (
        <GridCard
          key={rows[index]!.id}
          shared={shared}
          record={rows[index]!}
          posInSet={firstIndex + index}
          setSize={setSize}
          measure={{ index: row, ref: first ? measureElement : undefined }}
        />
      ))}
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
  const columns = useColumnCount(columnsRef)
  const byRow = useGridRange(range, columns)
  const reportRow = useCallback(
    (gridRow: number) => onRow?.(gridRow * columns),
    [onRow, columns]
  )
  const { bodyRef, items, total, margin, measureElement, first } =
    useRangeWindow<HTMLUListElement>({
      range: byRow,
      row: Math.floor(row / columns),
      onRow: reportRow,
      measure: true,
      gapRem: GRID_GAP_REM,
      estimateRem: estimateRem(shared.parts)
    })
  useHeldHeight(bodyRef, true)
  const setRefs = useBodyRef(bodyRef, columnsRef)
  const size = range.total ?? -1
  const firstShown = (first ?? 0) * columns
  return (
    <GridList
      {...listProps}
      busy={listProps.busy || range.loading}
      bodyRef={setRefs}
      padding={windowPadding(items, total, margin, false)}
    >
      {rowSpans(items, columns, range.count).map(
        ({ row: gridRow, index, first: isFirst }) => {
          // With the query too, so a new search's card starts fresh.
          const key = `${range.key}${indexKey(index)}`
          const measure = {
            index: gridRow,
            ref: isFirst ? measureElement : undefined
          }
          const held = range.rowAt(index)
          const failed = held
            ? undefined
            : failedRowAt(range, index, firstShown)
          if (failed?.error)
            return (
              <RecordTableNarrowRangeError
                key={rangeErrorKey(failed.start)}
                card
                banner={shared.parts.image !== undefined}
                posInSet={index + 1}
                setSize={size}
                index={measure.index}
                measureElement={measure.ref}
              />
            )
          return held ? (
            // By index: a shifting offset API can return one id twice.
            <GridCard
              key={key}
              shared={shared}
              record={held}
              posInSet={index + 1}
              setSize={size}
              measure={measure}
            />
          ) : (
            <NarrowPlaceholder
              key={key}
              parts={shared.parts}
              card
              index={measure.index}
              measureElement={measure.ref}
              blank={failed !== undefined}
            />
          )
        }
      )}
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
