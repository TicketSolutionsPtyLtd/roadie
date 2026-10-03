'use client'

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
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
import { useRecordsContext } from '../Records/context'
import type { RecordsContentProps } from '../Records/layouts'
import { pageState } from '../Records/selection'
import { firstDirection } from '../Records/sortOptions'
import { useStickyTop } from '../Records/stickyTop'
import { surfaceClass, useSurface } from '../Records/surface'
import { SURVIVOR } from '../Records/useBulkActions'
import { ScrollArea } from '../ScrollArea'
import {
  RecordTableRow,
  actionsCellClass,
  cellClass,
  pinStyle,
  rowClass,
  selectCellClass,
  titleColumn
} from './RecordTableRow'
import { RecordTablePageCheckbox } from './RecordTableSelectCell'
import { RecordTableSkeletonRows, StateRow } from './RecordTableStates'
import { shownColumns } from './columns'
import { SELECT_WIDTH, columnLayout, columnWidths, sameWidths } from './layout'
import type { TableLayoutConfig } from './tableLayout'

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
    setBulkSlot
  } = useRecordsContext()
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

  const sampled = useMemo(
    () => columnWidths(columns, records.data, records.timeZone),
    [columns, records.data, records.timeZone]
  )
  // Kept while equal, so new data with the same widths leaves the layout alone.
  const [kept, keep] = useState(sampled)
  const widths = sameWidths(kept, sampled) ? kept : sampled
  if (widths !== kept) keep(widths)
  const layout = useMemo(
    () =>
      columnLayout(columns, widths, {
        select: selectable,
        actions: hasRowActions
      }),
    [columns, widths, selectable, hasRowActions]
  )
  const style = {
    '--record-table-columns': layout.template,
    '--record-table-min-width': `${layout.minWidth}rem`
  } as CSSProperties

  const { rows } = records
  const busy = records.loading && !records.error
  const dimmed = busy && rows.length > 0
  const awaitingRows = busy && rows.length === 0
  // What the rows show: a sort the fields can't apply marks nothing.
  const sort = records.resolvedQuery.sort
  const pageIds = rows.map((row) => row.id)

  const hasBulkSlot = bulkMounted && selectable
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

  // Error, then skeleton, then empty: what replaces the rows.
  const state = records.error ? (
    <StateRow columns={columnCount}>
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
  ) : rows.length === 0 ? (
    <StateRow columns={columnCount}>
      <RecordsEmpty records={records} />
    </StateRow>
  ) : null
  const body = state ?? (
    <div role='rowgroup' data-slot='record-table-body'>
      {rows.map((row) => (
        <RecordTableRow
          key={row.id}
          id={row.id}
          record={row.row}
          columns={columns}
          layout={layout}
          title={title}
          timeZone={records.timeZone}
          selected={selectable ? records.isSelected(row.id) : undefined}
          onToggle={toggleRow}
          rowActions={hasRowActions ? rowActions : undefined}
          href={getRowHref?.(row.row)}
        />
      ))}
    </div>
  )

  const content = (
    <div
      data-slot='record-table-frame'
      data-records-content=''
      // In a box, the viewport is the region: it holds the focus.
      role={boxed ? undefined : 'region'}
      aria-label={boxed ? undefined : `${caption ?? 'Table'}, scrolls sideways`}
      className={boxed ? undefined : className}
    >
      <MeasuredWidth measured={boxed}>
        <div
          ref={contentRef}
          role='table'
          aria-label={caption}
          aria-busy={busy || undefined}
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
                  style={barShown ? { width: `${SELECT_WIDTH}rem` } : undefined}
                >
                  <RecordTablePageCheckbox
                    state={pageState(records.selection, pageIds)}
                    onChange={records.selectPage}
                    disabled={rows.length === 0 || Boolean(records.error)}
                  />
                </div>
              )}
              {columns.map((column, index) => {
                const direction =
                  sort[0]?.field === column.key ? sort[0].direction : undefined
                return (
                  <div
                    key={column.key}
                    role='columnheader'
                    aria-sort={direction}
                    data-pin={column.pin || undefined}
                    className={
                      // Still read under the bar, so cells keep their headers.
                      barShown
                        ? 'sr-only'
                        : cn(cellClass(column), headerTextClass)
                    }
                    style={pinStyle(layout.pinnedStart[index])}
                  >
                    {barShown || column.field.sortable === false ? (
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
                    barShown ? 'sr-only' : cn(actionsCellClass, headerTextClass)
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
            {dimmed && (
              <div
                aria-hidden
                data-slot='record-table-progress'
                className='pointer-events-none absolute inset-x-0 bottom-0'
              >
                <Progress value={null}>
                  <Progress.Track className='h-0.5 rounded-none bg-transparent'>
                    <Progress.Indicator />
                  </Progress.Track>
                </Progress>
              </div>
            )}
          </div>
          {boxed ? (
            <div
              ref={scrollerRef}
              data-slot='record-table-scroller'
              {...{ [SURVIVOR]: 'rows' }}
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
                {...{ [SURVIVOR]: 'rows' }}
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
        className='mt-9'
      >
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar
        orientation='horizontal'
        data-slot='record-table-scrollbar-x'
      >
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}
RecordTableContent.displayName = 'RecordTableContent'
