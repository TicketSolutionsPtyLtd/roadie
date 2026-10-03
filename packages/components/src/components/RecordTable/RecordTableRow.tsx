import { type CSSProperties, memo } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RecordValue } from '../Records/RecordValue'
import { surfaceClass } from '../Records/surface'
import type { ColumnLayout } from './layout'
import type { RecordTableColumn } from './types'

export const ROW_HEIGHT = 48

// WebKit builds without overflow-clip-margin drop the clip instead of the
// ring. Decided in CSS, so the server and browser render the same classes.
const cellOverflowClass =
  'overflow-visible supports-[overflow-clip-margin:0.25rem]:overflow-clip supports-[overflow-clip-margin:0.25rem]:[overflow-clip-margin:--spacing(1)]'

export const rowClass =
  'grid min-w-(--record-table-min-width) grid-cols-(--record-table-columns)'

const isFigure = (column: RecordTableColumn) =>
  column.field.type === 'number' || column.field.type === 'money'

export const cellClass = (column: RecordTableColumn) =>
  cn(
    'flex min-w-0 items-center px-2.5 first:ps-0 last:pe-0',
    isFigure(column) ? 'justify-end text-end' : 'justify-start',
    column.pin &&
      cn('sticky start-(--record-table-pin-start) z-docked', surfaceClass)
  )

export const pinStyle = (start: number | undefined) =>
  start === undefined
    ? undefined
    : ({ '--record-table-pin-start': `${start}rem` } as CSSProperties)

/** The column whose value names the row: the first pinned text column, else the first text one. */
export const titleColumn = (columns: readonly RecordTableColumn[]) =>
  columns.find((column) => column.pin && column.field.type === 'text') ??
  columns.find((column) => column.field.type === 'text')

type RecordTableRowProps = {
  id: string
  record: object
  columns: readonly RecordTableColumn[]
  layout: ColumnLayout
  title: RecordTableColumn | undefined
  timeZone: string
}

// Memoised so rows a change doesn't touch skip re-rendering.
export const RecordTableRow = memo(function RecordTableRow({
  id,
  record,
  columns,
  layout,
  title,
  timeZone
}: RecordTableRowProps) {
  return (
    <div
      role='row'
      data-slot='record-table-row'
      data-row-id={id}
      className={cn(rowClass, 'h-12 border-b border-subtler')}
    >
      {columns.map((column, index) => (
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
          {column.cell ? (
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
          )}
        </div>
      ))}
    </div>
  )
})
RecordTableRow.displayName = 'RecordTableRow'
