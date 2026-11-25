'use client'

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
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
import { surfaceClass, useSurface } from '../../utils/surface'
import { SortIcon } from '../DataTable/SortIcon'
import { RecordsEmpty, RecordsError } from '../Records/RecordsStates'
import type { RecordsContentProps } from '../Records/layouts'
import { useNarrow } from '../Records/narrow'
import { pageState } from '../Records/selection'
import { firstDirection } from '../Records/sortOptions'
import { useStickyTop } from '../Records/stickyTop'
import { tableFocusTarget } from '../Records/tableFocus'
import {
  RecordsLayoutState,
  RecordsProgress,
  RecordsStickyProgress,
  useRecordsLayout
} from '../Records/useRecordsLayout'
import { useSelectModeLayout } from '../Records/useSelectModeLayout'
import { ScrollArea } from '../ScrollArea'
import { NarrowSkeleton, RecordTableNarrowRows } from './RecordTableNarrowRows'
import {
  actionsCellClass,
  cellClass,
  pinStyle,
  rowClass,
  selectCellClass
} from './RecordTableRow'
import { RecordTableRows } from './RecordTableRows'
import { RecordTablePageCheckbox } from './RecordTableSelectCell'
import { RecordTableSkeletonRows, StateRow } from './RecordTableStates'
import {
  RecordTableNarrowTotals,
  RecordTableTotalsRow
} from './RecordTableTotals'
import { shownColumns } from './columns'
import {
  NARROW_HEAD_CLASS,
  NARROW_SORT_CLASS,
  SELECT_WIDTH,
  columnLayout,
  contentTierClass,
  frameClass,
  narrowContentClass,
  priorityClass,
  priorityProps,
  tierStyle,
  titleColumn
} from './layout'
import { useLayoutFocus } from './layoutFocus'
import { cardParts, narrowLayout, narrowParts } from './narrow'
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
    <ScrollArea.Content className='grid grow'>{children}</ScrollArea.Content>
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

const headerTextClass = 'font-semibold whitespace-nowrap text-subtle'

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
  const frame = useRecordsLayout({ fill, maxHeight })
  const {
    records,
    caption,
    toolbar,
    scope,
    bulkMounted,
    setBulkSlot,
    frameRef,
    boxed,
    state,
    partial
  } = frame
  const headRef = useRef<HTMLDivElement>(null)
  const totalsClipRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const headTop = useStickyTop(headRef, toolbar, scope, boxed)
  // On the table, so the head and pinned cells inherit it.
  useSurface(contentRef, boxed)
  const allColumns = config.columns
  const viewLayout = records.view.layout
  const columns = useMemo(
    () => shownColumns(allColumns, viewLayout),
    [allColumns, viewLayout]
  )
  const title = titleColumn(columns)

  const { selectable, getRowHref, totals } = records
  const cards = (config.narrow ?? narrowLayout(columns)) === 'cards'
  // Rows re-flow under 40rem; deprecated cards, and for now selection and totals, still swap for a list.
  const swaps = cards || selectable || totals !== undefined
  const isNarrow = useNarrow(frameRef, { placement: boxed })
  const narrow = isNarrow && swaps ? (cards ? 'cards' : 'list') : undefined
  // Re-flowed rows fit the frame, so nothing scrolls sideways to name or tab to.
  const fits = isNarrow && !swaps
  const parts = useMemo(() => {
    const roles = narrowParts(columns)
    // A row lists details on its second line; a table's detail columns are for cards only.
    return narrow === 'cards' ? cardParts(roles) : { ...roles, details: [] }
  }, [columns, narrow])
  useKeepFocusShown(frameRef, boxed)
  useLayoutFocus(frameRef, narrow ?? 'wide', boxed)
  // Narrow rows select only through Select mode; wide rows have checkboxes and keep it.
  const selecting = useSelectModeLayout(narrow !== undefined)

  const { toggleRow, rowActions, isSelected } = frame
  const hasRowActions = rowActions !== undefined
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
        actions: hasRowActions,
        reflow: !swaps
      }),
    [columns, widths, selectable, hasRowActions, swaps]
  )
  const style = tierStyle(layout) as CSSProperties

  const { rows, range } = records
  const headRows = totals ? 2 : 1
  const headTextClass = cn(headerTextClass, totals ? 'text-sm' : 'text-xs')
  const { busy, dimmed } = frame
  // The table counts every row, the header rows too.
  const rowCount = !partial
    ? undefined
    : range
      ? range.total === undefined
        ? -1
        : range.count + headRows
      : records.resultCount + headRows
  const firstIndex = partial ? frame.firstIndex + headRows : undefined
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
  // Whichever clips, the head or the totals under the bar, takes the rows' scroll.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    syncScroll(scroller, barShown ? totalsClipRef : headRef)
  }, [barShown])
  const columnCount =
    columns.length + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0)

  const narrowState =
    state === 'loading' ? (
      <NarrowSkeleton
        parts={parts}
        layout={narrow ?? 'list'}
        size={records.position.pageSize}
      />
    ) : state ? (
      <RecordsLayoutState key={state} kind={state} records={records} />
    ) : null
  // Keyed, so one state replacing another hands its button's focus on.
  const stateRows =
    state === 'error' ? (
      <StateRow key='error' columns={columnCount}>
        <RecordsError records={records} />
      </StateRow>
    ) : state === 'loading' ? (
      <RecordTableSkeletonRows
        columns={columns}
        layout={layout}
        size={records.position.pageSize}
        select={selectable}
        actions={hasRowActions}
      />
    ) : state === 'empty' ? (
      <StateRow key='empty' columns={columnCount}>
        <RecordsEmpty records={records} />
      </StateRow>
    ) : null
  const body = stateRows ?? (
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
      isSelected={isSelected}
      onToggle={toggleRow}
      rowActions={rowActions}
      getRowHref={getRowHref}
      columnCount={columnCount}
    />
  )

  const narrowBody = narrow !== undefined && (
    <>
      {totals && (
        <RecordTableNarrowTotals
          totals={totals}
          columns={columns}
          timeZone={records.timeZone}
        />
      )}
      {dimmed && (
        // Sticks where the wide header would.
        <RecordsStickyProgress
          slot='record-table-progress'
          top={frame.stickyTop}
        />
      )}
      <div
        ref={scrollerRef}
        data-slot='record-table-scroller'
        {...frame.rowsSurvivor}
        tabIndex={-1}
        className={frame.scrollerClass}
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
            firstIndex={partial ? frame.firstIndex : undefined}
            setSize={partial && !range ? records.resultCount : undefined}
            selecting={selecting}
            isSelected={isSelected}
            onToggle={toggleRow}
            rowActions={rowActions}
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
      {...frame.frameProps}
      data-slot='record-table-frame'
      data-narrow={narrow ? '' : undefined}
      // In a box, the viewport is the region: it holds the focus.
      role={boxed || narrow || fits ? undefined : 'region'}
      aria-label={
        boxed || narrow || fits
          ? undefined
          : `${caption ?? 'Table'}, scrolls sideways`
      }
      // Full width: a size container takes no width from its rows. In a
      // box, full height too, so a state centres in it, and clipped, so
      // narrow rows never scroll it sideways.
      className={cn(
        'w-full',
        frameClass,
        boxed ? ['flex flex-col', narrow && 'overflow-x-clip'] : className
      )}
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
            className={cn(
              'text-sm tabular-nums',
              contentTierClass,
              narrowContentClass(layout),
              boxed && 'grid grid-rows-[auto_1fr]'
            )}
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
                  'h-9',
                  !totals && 'border-b border-normal',
                  layout.narrow && NARROW_HEAD_CLASS,
                  // Frame wide and stuck at its start, so it never scrolls sideways with the columns.
                  barShown
                    ? cn(
                        'sticky start-0 flex items-center pe-(--content-inset)',
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
                      headTextClass,
                      barShown && 'h-full shrink-0'
                    )}
                    style={
                      barShown
                        ? {
                            width: `calc(${SELECT_WIDTH}rem + var(--content-inset))`
                          }
                        : undefined
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
                      // Its sort button hides under 40rem, so the header keeps its name.
                      aria-label={
                        layout.narrow ? column.field.label : undefined
                      }
                      data-pin={column.pin || undefined}
                      {...priorityProps(layout, index)}
                      className={cn(
                        priorityClass(layout, index),
                        // Still read under the bar, so cells keep their headers.
                        barShown
                          ? 'sr-only'
                          : cn(
                              cellClass(column),
                              headTextClass,
                              // The bulk slot after it is the row's last child.
                              hasBulkSlot &&
                                !hasRowActions &&
                                index === columns.length - 1 &&
                                'pe-(--content-inset)'
                            )
                      )}
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
                            layout.narrow && NARROW_SORT_CLASS,
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
                      barShown ? 'sr-only' : cn(actionsCellClass, headTextClass)
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
              {totals && (
                <div
                  ref={totalsClipRef}
                  role='none'
                  data-slot='record-table-totals-clip'
                  // Under the bar, the head no longer clips the totals as they scroll with the columns.
                  className={cn(!boxed && barShown && 'overflow-hidden')}
                >
                  <RecordTableTotalsRow
                    totals={totals}
                    columns={columns}
                    timeZone={records.timeZone}
                    layout={layout}
                    select={selectable}
                    actions={hasRowActions}
                    rowIndex={partial ? 2 : undefined}
                  />
                </div>
              )}
              {dimmed && (
                <div
                  aria-hidden
                  data-slot='record-table-progress'
                  className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-0',
                    // The header row hides under 40rem, so the bar runs along the rows' top.
                    layout.narrow &&
                      '@max-[40rem]/record-table-frame:top-0 @max-[40rem]/record-table-frame:bottom-auto'
                  )}
                >
                  <RecordsProgress />
                </div>
              )}
            </div>
            {boxed ? (
              <div
                ref={scrollerRef}
                data-slot='record-table-scroller'
                {...frame.rowsSurvivor}
                tabIndex={-1}
                className={cn(
                  'isolate grid items-start',
                  dimmed && 'opacity-60'
                )}
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
                  {...frame.rowsSurvivor}
                  // Focusable, so not Base UI's presentation role; the frame names the region.
                  role={undefined}
                  tabIndex={fits ? -1 : 0}
                  className={cn('isolate', dimmed && 'opacity-60')}
                  style={SIDEWAYS_ONLY}
                  onScroll={(event) => {
                    syncScroll(event.currentTarget, headRef)
                    syncScroll(event.currentTarget, totalsClipRef)
                  }}
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
        <ScrollArea.Content fitWidth={false} className='grid min-h-full'>
          {content}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      {/* Starts under the sticky header, as a pane's does under its own; re-flowed rows hide the header under 40rem. */}
      <ScrollArea.Scrollbar
        keepMounted
        data-slot='record-table-scrollbar'
        className={
          narrow ? undefined : totals ? 'mt-16' : 'mt-9 @max-[40rem]:mt-0'
        }
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

function inHiddenColumn(element: Element) {
  const cell = element.closest('[data-priority], [data-narrow]')
  if (!cell) return false
  // A sort button hides under 40rem while its header stays for screen readers.
  return (
    getComputedStyle(cell).display === 'none' ||
    getComputedStyle(element).visibility === 'hidden'
  )
}

/** Moves focus to the table when a priority tier hides the column holding it, which CSS does without unmounting it. */
function useKeepFocusShown(
  frameRef: RefObject<HTMLElement | null>,
  placement: unknown
) {
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    // Chromium blurs a focused element that stops rendering, and under load
    // that can land before this observer runs, leaving focus on the page.
    // Only that blur is held, so a click on blank page keeps focus there.
    let blurred: Element | null = null
    const onFocusOut = (event: FocusEvent) => {
      const target = event.target as Element
      blurred = !event.relatedTarget && inHiddenColumn(target) ? target : null
    }
    const onFocusIn = () => {
      blurred = null
    }
    const observer = new ResizeObserver(() => {
      const active = document.activeElement
      const held =
        active && frame.contains(active)
          ? active
          : (!active || active === document.body) && blurred?.isConnected
            ? blurred
            : null
      blurred = null
      if (!held || !inHiddenColumn(held)) return
      ;(
        tableFocusTarget(held) ??
        frame.querySelector<HTMLElement>('[data-slot="record-table-scroller"]')
      )?.focus({ preventScroll: true })
    })
    observer.observe(frame)
    frame.addEventListener('focusout', onFocusOut)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      observer.disconnect()
      frame.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [frameRef, placement])
}
