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
import { RecordValue } from '../Records/RecordValue'
import { RecordsRowActions } from '../Records/RecordsRowActions'
import { handleRowClick, onRowControl } from '../Records/rowLink'
import { RecordTableRowCheckbox } from './RecordTableSelectCell'
import type { ColumnLayout } from './layout'
import { useKeepFocusInTable } from './tableFocus'
import type { RecordTableColumn } from './types'

/** `h-12`, in rem. */
export const ROW_REM = 3
/** At the default 16px root. */
export const ROW_HEIGHT = ROW_REM * 16

// WebKit builds without overflow-clip-margin drop the clip instead of the
// ring. Decided in CSS, so the server and browser render the same classes.
const cellOverflowClass =
  'overflow-visible supports-[overflow-clip-margin:0.25rem]:overflow-clip supports-[overflow-clip-margin:0.25rem]:[overflow-clip-margin:--spacing(1)]'

// The gutter is a pane's inset when the table reaches the pane's edges, so the
// first column still lines up with the content above and dividers run across.
export const rowClass = cn(
  'grid grid-cols-(--record-table-columns) px-(--record-table-gutter,0px)',
  'min-w-[calc(var(--record-table-min-width)+2*var(--record-table-gutter,0px))]',
  'bg-(--record-table-row-surface,transparent)'
)

const isFigure = (column: RecordTableColumn) =>
  column.field.type === 'number' || column.field.type === 'money'

// --record-table-row-surface, set by a selected or hovered row, lets pinned
// and unpinned cells paint the same opaque tint; unset, cells fall through.
const pinnedSurface =
  'bg-(--record-table-row-surface,var(--records-surface,var(--pane-surface,var(--intent-bg-normal))))'

export const cellClass = (column: RecordTableColumn) =>
  cn(
    'flex min-w-0 items-center px-2.5 first:ps-0 last:pe-0',
    isFigure(column) ? 'justify-end text-end' : 'justify-start',
    column.pin
      ? cn('sticky start-(--record-table-pin-start) z-docked', pinnedSurface)
      : 'bg-(--record-table-row-surface,transparent)'
  )

/** The checkbox cell, pinned first and centred, so a focus ring has room on both sides. */
export const selectCellClass = cn(
  'sticky start-0 z-docked flex min-w-0 items-center justify-center',
  pinnedSurface
)

/** The row actions cell, pinned to the end. */
export const actionsCellClass = cn(
  'sticky end-0 z-docked flex min-w-0 items-center justify-center',
  pinnedSurface
)

export const pinStyle = (start: number | undefined) =>
  start === undefined
    ? undefined
    : ({ '--record-table-pin-start': `${start}rem` } as CSSProperties)

/** The column whose value names the row: the first pinned text column, else the first text one. */
export const titleColumn = (columns: readonly RecordTableColumn[]) =>
  columns.find((column) => column.pin && column.field.type === 'text') ??
  columns.find((column) => column.field.type === 'text')

// The title column is text, which reads the same in any zone.
const titleText = (record: object, title: RecordTableColumn | undefined) => {
  const text = title
    ? formatRecordValue(record, title.field, { timeZone: 'UTC' })
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
  const name = titleText(record, title)
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
        'h-12 border-b border-subtler',
        clickable && clickableRowClass,
        selectedRowClass
      )}
    >
      {selectable && (
        <div role='cell' className={cn(selectCellClass, cellOverflowClass)}>
          <RecordTableRowCheckbox
            id={id}
            title={name ?? id}
            selected={selected}
            onToggle={onToggle}
          />
        </div>
      )}
      {columns.map((column, index) => {
        const content = column.cell ? (
          column.cell({
            value: (record as Record<string, unknown>)[column.key],
            row: record,
            field: column.field
          })
        ) : (
          <RecordValue
            field={column.field}
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
