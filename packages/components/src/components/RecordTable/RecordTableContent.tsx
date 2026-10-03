'use client'

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
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

import { SortIcon } from '../DataTable/SortIcon'
import { Progress } from '../Progress'
import { RecordsEmpty, RecordsError } from '../Records/RecordsStates'
import { useRecordsContext } from '../Records/context'
import type {
  RecordLayoutDefinition,
  RecordsContentProps
} from '../Records/layouts'
import { useStickyTop } from '../Records/stickyTop'
import { surfaceClass } from '../Records/surface'
import { ScrollArea } from '../ScrollArea'
import {
  RecordTableRow,
  cellClass,
  pinStyle,
  rowClass,
  titleColumn
} from './RecordTableRow'
import { RecordTableSkeletonRows, StateRow } from './RecordTableStates'
import { shownColumns } from './columns'
import { columnLayout, columnWidths, sameWidths } from './layout'
import type { TableLayoutDefinition } from './tableLayout'

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

const firstDirection = (field: RecordField): RecordSortDirection =>
  field.type === 'number' || field.type === 'money' ? 'descending' : 'ascending'

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
  layout: RecordLayoutDefinition
}

export function RecordTableContent({
  className,
  maxHeight,
  fill = false,
  layout: definition
}: RecordTableContentProps) {
  const { records, caption, setContentFill } = useRecordsContext()
  const headRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const headTop = useStickyTop(headRef, { underToolbar: true })
  // In its own box, one viewport scrolls both ways; otherwise only the rows scroll sideways.
  const boxed = fill || Boolean(maxHeight)
  const { columns: allColumns } = definition as TableLayoutDefinition
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

  const sampled = useMemo(
    () => columnWidths(columns, records.data, records.timeZone),
    [columns, records.data, records.timeZone]
  )
  // Kept while equal, so new data with the same widths leaves the layout alone.
  const [kept, keep] = useState(sampled)
  const widths = sameWidths(kept, sampled) ? kept : sampled
  if (widths !== kept) keep(widths)
  const layout = useMemo(() => columnLayout(columns, widths), [columns, widths])
  const style = {
    '--record-table-columns': layout.template,
    '--record-table-min-width': `${layout.minWidth}rem`
  } as CSSProperties

  const { rows } = records
  const busy = records.loading && !records.error
  const dimmed = busy && rows.length > 0
  const awaitingRows = busy && rows.length === 0
  const sort = records.view.query.sort

  // Error, then skeleton, then empty: what replaces the rows.
  const state = records.error ? (
    <StateRow>
      <RecordsError records={records} />
    </StateRow>
  ) : awaitingRows ? (
    <RecordTableSkeletonRows
      columns={columns}
      layout={layout}
      size={records.position.pageSize}
    />
  ) : rows.length === 0 ? (
    <StateRow>
      <RecordsEmpty records={records} />
    </StateRow>
  ) : null
  const body = state ?? (
    <div role='rowgroup' data-slot='record-table-body'>
      {rows.map((row) => (
        <RecordTableRow
          key={row.id}
          id={row.id}
          record={row.record}
          columns={columns}
          layout={layout}
          title={title}
          timeZone={records.timeZone}
        />
      ))}
    </div>
  )

  const content = (
    <div
      data-slot='record-table-frame'
      // In a box, the viewport is the region: it holds the focus.
      role={boxed ? undefined : 'region'}
      aria-label={boxed ? undefined : `${caption ?? 'Table'}, scrolls sideways`}
      className={boxed ? undefined : className}
    >
      <MeasuredWidth measured={boxed}>
        <div
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
              !boxed && 'overflow-hidden'
            )}
          >
            <div
              role='row'
              data-slot='record-table-head-row'
              className={cn(rowClass, 'h-9 border-b border-normal')}
            >
              {columns.map((column, index) => {
                const direction =
                  sort[0]?.field === column.key ? sort[0].direction : undefined
                return (
                  <div
                    key={column.key}
                    role='columnheader'
                    aria-sort={direction}
                    data-pin={column.pin || undefined}
                    className={cn(
                      cellClass(column),
                      'text-xs font-semibold whitespace-nowrap text-subtle'
                    )}
                    style={pinStyle(layout.pinnedStart[index])}
                  >
                    {column.field.sortable === false ? (
                      column.field.label
                    ) : (
                      <button
                        type='button'
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
      className={cn(fill && 'h-full min-h-0 grow basis-0', className)}
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
RecordTableContent.displayName = 'RecordTable.Content'
