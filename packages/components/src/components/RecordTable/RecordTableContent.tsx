'use client'

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef
} from 'react'

import {
  type RecordField,
  type RecordSort,
  type RecordSortDirection
} from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { SortIcon } from '../DataTable/SortIcon'
import { Progress } from '../Progress'
import { RecordsEmpty, RecordsError } from '../Records/RecordsStates'
import { isSelecting, useRecordsContext } from '../Records/context'
import type { RecordsContentProps } from '../Records/layouts'
import { useNarrow } from '../Records/narrow'
import { leaveSelectOnEscape } from '../Records/selectMode'
import { pageState } from '../Records/selection'
import { firstDirection } from '../Records/sortOptions'
import { useStickyTop } from '../Records/stickyTop'
import { surfaceClass, useSurface } from '../Records/surface'
import { useSurvivor } from '../Records/useBulkActions'
import { ScrollArea } from '../ScrollArea'
import { NarrowSkeleton, RecordTableNarrowRows } from './RecordTableNarrowRows'
import {
  actionsCellClass,
  cellClass,
  pinStyle,
  rowClass,
  selectCellClass,
  titleColumn
} from './RecordTableRow'
import { RecordTableRows, VIRTUALISE_AFTER } from './RecordTableRows'
import { RecordTablePageCheckbox } from './RecordTableSelectCell'
import { RecordTableSkeletonRows, StateRow } from './RecordTableStates'
import { shownColumns } from './columns'
import { SELECT_WIDTH, columnLayout, priorityProps, tierStyle } from './layout'
import { useLayoutFocus } from './layoutFocus'
import { cardParts, narrowLayout, narrowParts } from './narrow'
import { useKeepFocusInTable } from './tableFocus'
import type { TableLayoutConfig } from './tableLayout'
import { useColumnWidths } from './useColumnWidths'

/**
 * In a box, sizes the table to its rows inside Base UI's measured content, so
 * the sticky header's surface spans them and a column shown or hidden updates
 * the horizontal scrollbar.
 */
function MeasuredWidth({
  measured,
  children
}: {
  measured: boolean
  children: ReactNode
}) {
  return measured ? (
    <ScrollArea.Content>{children}</ScrollArea.Content>
  ) : (
    children
  )
}

// Base UI writes overflow inline. The page or pane scrolls the rows down, and
// a vertical scroller here would also capture the sticky header.
const SIDEWAYS_ONLY = {
  overflowY: 'hidden',
  overscrollBehaviorX: 'contain',
  overscrollBehaviorY: 'auto'
} as const

const headerTextClass = 'text-xs font-semibold whitespace-nowrap text-subtle'

const STICKY_BAR = {
  position: 'sticky',
  bottom: 'calc(var(--pane-sticky-bottom, 0px) + 2px)'
} as const

function syncScroll(
  source: HTMLElement,
  target: RefObject<HTMLElement | null>
) {
  const element = target.current
  if (element && element.scrollLeft !== source.scrollLeft)
    element.scrollLeft = source.scrollLeft
}

/** A header click sorts by that field alone: first its natural way, then flipped. */
function nextSort(field: RecordField, sort: readonly RecordSort[]) {
  const current = sort[0]
  const direction: RecordSortDirection =
    current?.field === field.key
      ? current.direction === 'ascending'
        ? 'descending'
        : 'ascending'
      : firstDirection(field)
  return [{ field: field.key, direction }]
}

export type RecordTableContentProps = RecordsContentProps & {
  config: TableLayoutConfig
}

export function RecordTableContent({
  className,
  maxHeight,
  fill = false,
  config
}: RecordTableContentProps) {
  const {
    records,
    caption,
    toolbar,
    setContentFill,
    bulkMounted,
    setBulkSlot,
    setSelectMode
  } = useRecordsContext()
  const rowsSurvivor = useSurvivor('rows')
  const frameRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  // In its own box, one viewport scrolls both ways; otherwise only the rows scroll sideways.
  const boxed = fill || Boolean(maxHeight)
  const contentRef = useRef<HTMLDivElement>(null)
  const headTop = useStickyTop(headRef, toolbar, boxed)
  // On the table, so the head and pinned cells inherit it.
  useSurface(contentRef, boxed)
  const allColumns = config.columns
  const viewLayout = records.view.layout
  const columns = useMemo(
    () => shownColumns(allColumns, viewLayout),
    [allColumns, viewLayout]
  )
  const title = titleColumn(columns)
  useLayoutEffect(() => {
    setContentFill(fill)
    return () => setContentFill(false)
  }, [fill, setContentFill])

  const isNarrow = useNarrow(frameRef, { placement: boxed })
  const narrow = isNarrow ? (config.narrow ?? narrowLayout(columns)) : undefined
  const parts = useMemo(() => {
    const roles = narrowParts(columns)
    return narrow === 'cards' ? cardParts(roles) : roles
  }, [columns, narrow])
  const frameTop = useStickyTop(frameRef, toolbar, boxed)
  useLayoutFocus(frameRef, narrow ?? 'wide', boxed)
  // Narrow rows select only through Select mode; wide rows have checkboxes and keep it.
  const selecting = isSelecting(records, narrow !== undefined)
  const { selecting: committed, setSelecting } = records
  const isNarrowShown = narrow !== undefined
  // Narrow rows enter Select mode, and only a switch to wide leaves it, so a
  // second Content of another width under the same records never fights it.
  const wasNarrow = useRef(false)
  useLayoutEffect(() => {
    const left = wasNarrow.current && !isNarrowShown
    wasNarrow.current = isNarrowShown
    if (isNarrowShown && selecting && !committed)
      setSelecting(true, { keep: true })
    else if (left && committed) setSelecting(false, { keep: true })
    if (isNarrowShown) setSelectMode(true)
    else if (left) setSelectMode(false)
  }, [isNarrowShown, selecting, committed, setSelecting, setSelectMode])
  useLayoutEffect(
    () => () => {
      if (wasNarrow.current) setSelectMode(false)
    },
    [setSelectMode]
  )

  const { selectable, getRowHref } = records
  // Presence, not identity: an inline rowActions is new every render.
  const hasRowActions = Boolean(records.rowActions)
  // Stable, so a selection change or an inline rowActions leaves other rows alone.
  const latest = useRef(records)
  useLayoutEffect(() => {
    latest.current = records
  })
  const toggleRow = useCallback(
    (id: string, range: boolean) => latest.current.toggleRow(id, { range }),
    []
  )
  const rowActions = useCallback(
    (row: object) => latest.current.rowActions?.(row),
    []
  )
  const missingLinkColumn = getRowHref !== undefined && title === undefined
  // Once per table: a warning per row would flood the console.
  const warnedNoLinkColumn = useRef(false)
  useEffect(() => {
    if (!missingLinkColumn || warnedNoLinkColumn.current || !isDev()) return
    warnedNoLinkColumn.current = true
    console.warn(
      '[Roadie] Records getRowHref is set but no column can carry the link: show a text column for the link to attach to.'
    )
  }, [missingLinkColumn])

  const widths = useColumnWidths(columns, {
    mode: records.mode,
    data: records.data,
    query: records.scopedQuery,
    timeZone: records.timeZone
  })
  const layout = useMemo(
    () =>
      columnLayout(columns, widths, {
        select: selectable,
        actions: hasRowActions
      }),
    [columns, widths, selectable, hasRowActions]
  )
  const style = tierStyle(layout) as CSSProperties

  const { rows, range } = records
  const busy = records.loading && !records.error
  // Range mode keeps its rows bright: placeholders already show what loads.
  const dimmed = busy && !range && rows.length > 0
  const awaitingRows = busy && !range && rows.length === 0
  const shownPage = Math.min(records.position.page, records.pageCount - 1)
  // A page, a window or a range holds only some rows, so each carries its
  // place and the table counts them all, the header row too.
  const partial =
    range !== undefined ||
    rows.length > VIRTUALISE_AFTER ||
    records.pageCount > 1
  const rowCount = !partial
    ? undefined
    : range
      ? range.total === undefined
        ? -1
        : range.count + 1
      : records.resultCount + 1
  const firstIndex = partial
    ? shownPage * records.position.pageSize + 2
    : undefined
  // What the rows show: a sort the fields can't apply marks nothing.
  const sort = records.resolvedQuery.sort
  const pageIds = rows.map((row) => row.id)

  const hasBulkSlot = bulkMounted && selectable && narrow === undefined
  // The bulk actions take the header's place, so the rows never move.
  const barShown = hasBulkSlot && records.selectedCount > 0
  // A sort button under the bar unmounts; its focus lands on Select page.
  const sortFocused = useRef(false)
  useLayoutEffect(() => {
    if (!barShown || !sortFocused.current) return
    sortFocused.current = false
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected) return
    headRef.current
      ?.querySelector<HTMLElement>('[data-slot="record-table-page-checkbox"]')
      ?.focus()
  }, [barShown])
  // The head scrolls only with the header row; back, it rejoins the rows.
  useLayoutEffect(() => {
    if (!barShown && scrollerRef.current)
      syncScroll(scrollerRef.current, headRef)
  }, [barShown])
  const columnCount =
    columns.length + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0)

  const empty = range ? range.count === 0 : rows.length === 0
  // Keyed, so one state replacing another hands its button's focus on.
  const narrowState = records.error ? (
    <NarrowState key='error'>
      <RecordsError records={records} />
    </NarrowState>
  ) : awaitingRows ? (
    <NarrowSkeleton
      parts={parts}
      layout={narrow ?? 'list'}
      size={records.position.pageSize}
    />
  ) : empty ? (
    <NarrowState key='empty'>
      <RecordsEmpty records={records} />
    </NarrowState>
  ) : null
  // Error, then skeleton, then empty: what replaces the rows.
  const state = records.error ? (
    <StateRow key='error' columns={columnCount}>
      <RecordsError records={records} />
    </StateRow>
  ) : awaitingRows ? (
    <RecordTableSkeletonRows
      columns={columns}
      layout={layout}
      size={records.position.pageSize}
      select={selectable}
      actions={hasRowActions}
    />
  ) : empty ? (
    <StateRow key='empty' columns={columnCount}>
      <RecordsEmpty records={records} />
    </StateRow>
  ) : null
  const body = state ?? (
    <RecordTableRows
      rows={rows}
      firstIndex={firstIndex}
      range={range}
      row={records.position.row}
      onRow={records.setRow}
      columns={columns}
      layout={layout}
      title={title}
      timeZone={records.timeZone}
      isSelected={selectable ? records.isSelected : undefined}
      onToggle={toggleRow}
      rowActions={hasRowActions ? rowActions : undefined}
      getRowHref={getRowHref}
      columnCount={columnCount}
    />
  )

  const progress = dimmed && (
    <Progress value={null}>
      <Progress.Track className='h-0.5 rounded-none bg-transparent'>
        <Progress.Indicator />
      </Progress.Track>
    </Progress>
  )
  const narrowBody = narrow !== undefined && (
    <>
      {progress && (
        // Zero height, so the rows don't move; sticks where the wide header would.
        <div
          aria-hidden
          data-slot='record-table-progress'
          style={{ top: frameTop }}
          className='pointer-events-none sticky z-docked h-0'
        >
          <div className='absolute inset-x-0 top-0'>{progress}</div>
        </div>
      )}
      <div
        ref={scrollerRef}
        data-slot='record-table-scroller'
        {...rowsSurvivor}
        tabIndex={-1}
        className={cn('isolate outline-none', dimmed && 'opacity-60')}
      >
        {narrowState ?? (
          <RecordTableNarrowRows
            rows={rows}
            parts={parts}
            layout={narrow}
            bleed={!boxed}
            timeZone={records.timeZone}
            caption={caption}
            busy={busy}
            firstIndex={
              partial ? shownPage * records.position.pageSize + 1 : undefined
            }
            setSize={partial && !range ? records.resultCount : undefined}
            selecting={selecting}
            isSelected={selectable ? records.isSelected : undefined}
            onToggle={toggleRow}
            rowActions={hasRowActions ? rowActions : undefined}
            getRowHref={getRowHref}
            range={range}
            row={records.position.row}
            onRow={records.setRow}
          />
        )}
      </div>
    </>
  )

  // One element for both layouts, so the width it measures stays observed.
  const content = (
    <div
      ref={frameRef}
      data-slot='record-table-frame'
      data-records-content=''
      onKeyDown={leaveSelectOnEscape(records)}
      // In a box, the viewport is the region: it holds the focus.
      role={boxed || narrow ? undefined : 'region'}
      aria-label={
        boxed || narrow ? undefined : `${caption ?? 'Table'}, scrolls sideways`
      }
      // Full width: a size container takes no width from its rows. Clipped
      // in a box, so narrow rows never scroll it sideways.
      className={cn('w-full', boxed ? narrow && 'overflow-x-clip' : className)}
    >
      {narrowBody || (
        <MeasuredWidth measured={boxed}>
          <div
            ref={contentRef}
            role='table'
            aria-label={caption}
            // A state in place of the rows is no row of the count.
            aria-rowcount={state ? undefined : rowCount}
            aria-busy={busy || range?.loading || undefined}
            data-slot='record-table-content'
            className='text-sm tabular-nums'
            style={style}
          >
            <div
              ref={headRef}
              role='rowgroup'
              data-slot='record-table-head'
              style={{ top: headTop }}
              // Focus can scroll the clipped head to an off-screen sort button.
              onScroll={
                boxed
                  ? undefined
                  : (event) => syncScroll(event.currentTarget, scrollerRef)
              }
              className={cn(
                'sticky z-docked',
                surfaceClass,
                // The bar fits the frame, so nothing to clip but its focus rings.
                !boxed && !barShown && 'overflow-hidden'
              )}
            >
              <div
                role='row'
                aria-rowindex={partial ? 1 : undefined}
                data-slot='record-table-head-row'
                onFocus={(event) => {
                  sortFocused.current = event.target.hasAttribute('data-sort')
                }}
                onBlur={(event) => {
                  // A removed button may blur on its way out; that one still counts.
                  if (event.relatedTarget || event.target.isConnected)
                    sortFocused.current = false
                }}
                className={cn(
                  'h-9 border-b border-normal',
                  // Frame wide and stuck at its start, so it never scrolls sideways with the columns.
                  barShown
                    ? cn(
                        'sticky start-0 flex items-center',
                        // In a box the head spans every column; the box's width is what shows.
                        boxed ? 'w-[100cqi]' : 'w-full'
                      )
                    : rowClass
                )}
              >
                {selectable && (
                  <div
                    role='columnheader'
                    className={cn(
                      selectCellClass,
                      headerTextClass,
                      barShown && 'h-full shrink-0'
                    )}
                    style={
                      barShown ? { width: `${SELECT_WIDTH}rem` } : undefined
                    }
                  >
                    <RecordTablePageCheckbox
                      label={range ? 'Select loaded rows' : undefined}
                      state={pageState(records.selection, pageIds)}
                      onChange={records.selectPage}
                      disabled={rows.length === 0 || Boolean(records.error)}
                    />
                  </div>
                )}
                {columns.map((column, index) => {
                  const direction =
                    sort[0]?.field === column.key
                      ? sort[0].direction
                      : undefined
                  return (
                    <div
                      key={column.key}
                      role='columnheader'
                      aria-sort={direction}
                      data-pin={column.pin || undefined}
                      {...priorityProps(column, layout, index)}
                      className={
                        // Still read under the bar, so cells keep their headers.
                        barShown
                          ? 'sr-only'
                          : cn(cellClass(column), headerTextClass)
                      }
                      style={pinStyle(layout.pinnedStart[index])}
                    >
                      {column.kind === 'image' ? (
                        // The thumbnails speak for themselves; a sort by URL means nothing.
                        <span className='sr-only'>{column.field.label}</span>
                      ) : barShown || column.field.sortable === false ? (
                        column.field.label
                      ) : (
                        <button
                          type='button'
                          data-sort=''
                          onClick={() =>
                            records.setSort(nextSort(column.field, sort))
                          }
                          className={cn(
                            'group is-interactive inline-flex items-center gap-1 rounded-sm font-semibold active:scale-100',
                            (column.field.type === 'number' ||
                              column.field.type === 'money') &&
                              'flex-row-reverse',
                            direction && 'text-strong'
                          )}
                        >
                          {column.field.label}
                          <SortIcon direction={direction} />
                        </button>
                      )}
                    </div>
                  )
                })}
                {hasRowActions && (
                  <div
                    role='columnheader'
                    className={
                      barShown
                        ? 'sr-only'
                        : cn(actionsCellClass, headerTextClass)
                    }
                  >
                    <span className='sr-only'>Actions</span>
                  </div>
                )}
                {hasBulkSlot && (
                  <div
                    ref={setBulkSlot}
                    // Last, with no cells under it, so every column keeps its own header.
                    role='columnheader'
                    data-slot='record-table-bulk-slot'
                    hidden={!barShown}
                    className='flex h-full min-w-0 flex-1'
                  />
                )}
              </div>
              {progress && (
                <div
                  aria-hidden
                  data-slot='record-table-progress'
                  className='pointer-events-none absolute inset-x-0 bottom-0'
                >
                  {progress}
                </div>
              )}
            </div>
            {boxed ? (
              <div
                ref={scrollerRef}
                data-slot='record-table-scroller'
                {...rowsSurvivor}
                tabIndex={-1}
                className={cn('isolate', dimmed && 'opacity-60')}
              >
                {body}
              </div>
            ) : (
              <ScrollArea
                data-slot='record-table-sideways'
                // Not a scroll container, so the scrollbar sticks to the one that scrolls the page.
                className='overflow-visible'
              >
                <ScrollArea.Viewport
                  ref={scrollerRef}
                  data-slot='record-table-scroller'
                  {...rowsSurvivor}
                  // Focusable, so not Base UI's presentation role; the frame names the region.
                  role={undefined}
                  tabIndex={0}
                  className={cn('isolate', dimmed && 'opacity-60')}
                  style={SIDEWAYS_ONLY}
                  onScroll={(event) => syncScroll(event.currentTarget, headRef)}
                >
                  <ScrollArea.Content>{body}</ScrollArea.Content>
                </ScrollArea.Viewport>
                {/* In flow and sticky, so it rides the bottom of whatever scrolls the page. */}
                <ScrollArea.Scrollbar
                  orientation='horizontal'
                  data-slot='record-table-scrollbar-x'
                  className='-mt-3'
                  // Above a pane's footer, by the gap its margin leaves elsewhere.
                  style={STICKY_BAR}
                >
                  <ScrollArea.Thumb />
                </ScrollArea.Scrollbar>
              </ScrollArea>
            )}
          </div>
        </MeasuredWidth>
      )}
    </div>
  )
  if (!boxed) return content
  return (
    <ScrollArea
      data-slot='record-table-box'
      data-pane-fill={fill || undefined}
      // basis-0, not flex-1: a percentage basis in a column of unknown height falls back to content.
      // A container, so the bulk actions bar spans the box's visible width.
      className={cn(
        '@container',
        fill && 'h-full min-h-0 grow basis-0',
        className
      )}
    >
      <ScrollArea.Viewport
        data-slot='record-table-viewport'
        role='region'
        aria-label={`${caption ?? 'Table'}, scrolls`}
        style={fill ? undefined : { maxHeight }}
      >
        <ScrollArea.Content fitWidth={false}>{content}</ScrollArea.Content>
      </ScrollArea.Viewport>
      {/* Starts under the sticky header, as a pane's does under its own. */}
      <ScrollArea.Scrollbar
        keepMounted
        data-slot='record-table-scrollbar'
        className={narrow ? undefined : 'mt-9'}
      >
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      {!narrow && (
        <ScrollArea.Scrollbar
          orientation='horizontal'
          data-slot='record-table-scrollbar-x'
        >
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      )}
    </ScrollArea>
  )
}
RecordTableContent.displayName = 'RecordTableContent'

/** A state in place of narrow rows, keeping focus in the table when its button goes. */
function NarrowState({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useKeepFocusInTable(ref)
  return <div ref={ref}>{children}</div>
}
