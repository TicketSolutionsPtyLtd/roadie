import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  memo,
  useRef
} from 'react'

import { formatRecordValue } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { RecordPartValue } from '../Records/RecordPartValue'
import { RecordsRowActions } from '../Records/RecordsRowActions'
import { RecordsRowCheckbox } from '../Records/RecordsRowCheckbox'
import { handleRowClick, onRowControl } from '../Records/rowLink'
import { type ColumnLayout, priorityProps } from './layout'
import { tableRowSize } from './rowSizing'
import { useKeepFocusInTable } from './tableFocus'
import type { RecordTableColumn } from './types'

// WebKit builds without overflow-clip-margin drop the clip instead of the
// ring. Decided in CSS, so the server and browser render the same classes.
const cellOverflowClass =
  'overflow-visible supports-[overflow-clip-margin:0.25rem]:overflow-clip supports-[overflow-clip-margin:0.25rem]:[overflow-clip-margin:--spacing(1)]'

export const rowClass =
  'grid min-w-(--record-table-min-width) grid-cols-(--record-table-columns)'

const isFigure = (column: RecordTableColumn) =>
  column.field.type === 'number' || column.field.type === 'money'

// --record-table-row-surface, set by a selected or hovered row, lets pinned
// and unpinned cells paint the same opaque tint; unset, cells fall through.
const pinnedSurface =
  'bg-(--record-table-row-surface,var(--records-surface,var(--pane-surface,var(--intent-bg-normal))))'

export const cellClass = (column: RecordTableColumn) =>
  cn(
    'flex min-w-0 items-center px-2.5 first:ps-(--content-inset) last:pe-(--content-inset)',
    isFigure(column) ? 'justify-end text-end' : 'justify-start',
    column.pin
      ? cn('sticky start-(--record-table-pin-start) z-docked', pinnedSurface)
      : 'bg-(--record-table-row-surface,transparent)'
  )

/** The checkbox cell, pinned first and centred, so a focus ring has room on both sides. */
export const selectCellClass = cn(
  'sticky start-0 z-docked flex min-w-0 items-center justify-center ps-(--content-inset)',
  pinnedSurface
)

/** The row actions cell, pinned to the end. */
export const actionsCellClass = cn(
  'sticky end-0 z-docked flex min-w-0 items-center justify-center pe-(--content-inset)',
  pinnedSurface
)

// After the first track, which carries the inset.
export const pinStyle = (start: number | undefined) =>
  start === undefined
    ? undefined
    : ({
        '--record-table-pin-start':
          start === 0 ? '0rem' : `calc(${start}rem + var(--content-inset))`
      } as CSSProperties)

/** The column whose value names the row: the narrow title, else the first pinned text column, else the first text one. Never an image. */
export function titleColumn<Column extends RecordTableColumn<never>>(
  columns: readonly Column[]
) {
  const named = columns.filter((column) => column.kind !== 'image')
  return (
    named.find((column) => column.narrow === 'title') ??
    named.find((column) => column.pin && column.field.type === 'text') ??
    named.find((column) => column.field.type === 'text')
  )
}

const titleText = (
  record: object,
  title: RecordTableColumn | undefined,
  timeZone: string
) => {
  const text = title
    ? formatRecordValue(record, title.field, { timeZone })
    : null
  return text?.trim() ? text : undefined
}

// Full literals: Tailwind's scanner misses class names assembled in JS.
const clickableRowClass = cn(
  'cursor-pointer',
  'hover:[--record-table-row-surface:color-mix(in_oklch,var(--intent-9)_6%,var(--records-surface,var(--pane-surface,var(--intent-bg-normal)))_94%)]',
  'data-selected:hover:[--record-table-row-surface:color-mix(in_oklch,var(--color-accent-9)_16%,var(--records-surface,var(--pane-surface,var(--intent-bg-normal)))_84%)]'
)

// Opaque, unlike bg-subtle: a pinned cell paints over its own sticky content.
const selectedRowClass =
  'data-selected:[--record-table-row-surface:color-mix(in_oklch,var(--color-accent-9)_11%,var(--records-surface,var(--pane-surface,var(--intent-bg-normal)))_89%)]'

type RecordTableRowProps = {
  id: string
  record: object
  columns: readonly RecordTableColumn[]
  layout: ColumnLayout
  title: RecordTableColumn | undefined
  timeZone: string
  /** Undefined when the records can't be selected. */
  selected?: boolean
  onToggle: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  href?: string
  /** One-based, counting the header row, when the table holds only some of its rows. */
  rowIndex?: number
}

// Memoised so rows a change doesn't touch skip re-rendering.
export const RecordTableRow = memo(function RecordTableRow({
  id,
  record,
  columns,
  layout,
  title,
  timeZone,
  selected,
  onToggle,
  rowActions,
  href,
  rowIndex
}: RecordTableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  useKeepFocusInTable(rowRef)
  const name = titleText(record, title, timeZone)
  const linked = href !== undefined && name !== undefined
  const selectable = selected !== undefined
  const clickable = linked || selectable
  const onRowClick = (event: MouseEvent<HTMLDivElement>) =>
    handleRowClick(
      event.nativeEvent,
      event.currentTarget,
      selectable ? (range) => onToggle(id, range) : undefined
    )
  return (
    <div
      ref={rowRef}
      role='row'
      aria-rowindex={rowIndex}
      data-slot='record-table-row'
      data-row-id={id}
      data-selected={selected || undefined}
      onMouseDown={
        selectable
          ? (event) => {
              // Shift extends the row selection, not a text selection; a
              // control keeps its press, so focus moves to it.
              if (
                event.shiftKey &&
                !onRowControl(event.nativeEvent, event.currentTarget)
              )
                event.preventDefault()
            }
          : undefined
      }
      onClick={clickable ? onRowClick : undefined}
      onAuxClick={linked ? onRowClick : undefined}
      className={cn(
        rowClass,
        tableRowSize.heightClass,
        'border-b border-subtler',
        clickable && clickableRowClass,
        selectedRowClass
      )}
    >
      {selectable && (
        <div role='cell' className={cn(selectCellClass, cellOverflowClass)}>
          <RecordsRowCheckbox
            id={id}
            title={name ?? id}
            selected={selected}
            onToggle={onToggle}
          />
        </div>
      )}
      {columns.map((column, index) => {
        const content = (
          <RecordPartValue
            part={column}
            row={record}
            timeZone={timeZone}
            className='min-w-0 truncate'
          />
        )
        return (
          <div
            key={column.key}
            role='cell'
            data-pin={column.pin || undefined}
            {...priorityProps(column, layout, index)}
            className={cn(
              cellClass(column),
              cellOverflowClass,
              // On the cell, so a custom cell inherits it and an empty value stays muted.
              column === title && 'font-semibold text-strong'
            )}
            style={pinStyle(layout.pinnedStart[index])}
          >
            {linked && column === title ? (
              <RoadieRoutedLink
                href={href}
                data-row-link=''
                className='min-w-0 truncate text-inherit no-underline hover:underline'
              >
                {content}
              </RoadieRoutedLink>
            ) : (
              content
            )}
          </div>
        )
      })}
      {rowActions && (
        <div
          role='cell'
          data-row-control
          className={cn(actionsCellClass, cellOverflowClass)}
        >
          <RecordsRowActions
            title={name ?? id}
            row={record}
            rowActions={rowActions}
          />
        </div>
      )}
    </div>
  )
})
RecordTableRow.displayName = 'RecordTableRow'
