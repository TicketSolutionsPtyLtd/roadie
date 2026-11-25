import type { CSSProperties, ReactNode } from 'react'

import type { TableColumn } from '@oztix/roadie-core/dashboard'
import { tableLabelIndex } from '@oztix/roadie-core/dashboard-layout'
import { cn } from '@oztix/roadie-core/utils'

import { Table } from '../Table'
import { DataTableCellContent } from './DataTableCell'
import { type KeyedRow, cellOf } from './sort'

export const alignOf = (column: TableColumn): 'start' | 'end' =>
  column.kind === 'number' || column.kind === 'delta' ? 'end' : 'start'

export const cellAttributes = (column: TableColumn) => ({
  'data-priority': column.priority,
  'data-pin': column.pin || undefined,
  align: alignOf(column)
})

/** Where a row of a grouped table sits, and whether its group is closed. */
export type GroupedRow = {
  depth: number
  collapsed: boolean
  /** The last row on show, which drops its rule as a table's last row does. */
  last: boolean
  /** A long table's groups snap open and shut. */
  instant: boolean
}

// Collapsed rows stay in the table so groups open and close like an
// Accordion; they're hidden from screen readers and the keyboard.
export const groupedRowProps = ({ collapsed }: GroupedRow) => ({
  'aria-hidden': collapsed || undefined,
  inert: collapsed || undefined
})

// A collapsed row's padding and rule go with its content.
export const groupedCellClass = ({ collapsed, last, instant }: GroupedRow) =>
  cn(
    !instant &&
      'transition-[padding-block,border-bottom-width] duration-moderate ease-enter',
    (collapsed || last) && 'border-b-0',
    collapsed && 'py-0'
  )

export function DataTableRow({
  columns,
  row: { row, href },
  titleKey,
  plain,
  grouped
}: {
  columns: readonly TableColumn[]
  row: KeyedRow
  titleKey?: string
  plain: boolean
  /** A grouped row indents its label cell and collapses with its group. */
  grouped?: GroupedRow
}) {
  // An empty title shows a muted placeholder, with nothing to link.
  const linked =
    !!href &&
    titleKey !== undefined &&
    cellOf(row, titleKey) != null &&
    cellOf(row, titleKey) !== ''
  const labelIndex = tableLabelIndex(columns)
  return (
    <Table.Row
      {...(grouped && groupedRowProps(grouped))}
      data-linked={linked || undefined}
      className={cn(linked && 'is-interactive-within')}
    >
      {columns.map((column, index) => {
        const content = (
          <DataTableCellContent
            column={column}
            value={cellOf(row, column.key)}
            secondary={
              column.secondaryKey ? cellOf(row, column.secondaryKey) : undefined
            }
            plain={plain}
            href={linked && column.key === titleKey ? href : undefined}
          />
        )
        return (
          <Table.Cell
            key={column.key}
            {...cellAttributes(column)}
            className={grouped && groupedCellClass(grouped)}
          >
            {grouped === undefined ? (
              content
            ) : (
              <DataTableCollapse grouped={grouped}>
                {index === labelIndex ? (
                  <DataTableIndent
                    depth={grouped.depth}
                    className={cn(alignOf(column) === 'end' && 'justify-end')}
                  >
                    {content}
                  </DataTableIndent>
                ) : (
                  content
                )}
              </DataTableCollapse>
            )}
          </Table.Cell>
        )
      })}
    </Table.Row>
  )
}

/**
 * Steps a grouped label in by a caret and its gap per level, so a row's
 * label lines up with its group's.
 */
export function DataTableIndent({
  depth,
  className,
  children
}: {
  depth: number
  className?: string
  children: ReactNode
}) {
  return (
    <span
      data-slot='data-table-indent'
      className={cn(
        'flex items-center gap-1 ps-[calc(var(--data-table-depth)*var(--spacing)*4)]',
        className
      )}
      style={{ '--data-table-depth': depth } as CSSProperties}
    >
      {children}
    </span>
  )
}

/** Shrinks a grouped cell's content to nothing while its row is collapsed. */
export function DataTableCollapse({
  grouped: { collapsed, instant },
  children
}: {
  grouped: GroupedRow
  children: ReactNode
}) {
  return (
    <div
      data-slot='data-table-collapse'
      className={cn(
        'grid',
        collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        !instant &&
          'transition-[grid-template-rows] duration-moderate ease-enter'
      )}
    >
      {/* Clips only the height it animates, with room for a sparkline's end
          dot once the row is open. */}
      <div
        className={cn(
          'min-h-0 overflow-x-visible overflow-y-clip',
          collapsed
            ? '[overflow-clip-margin:0px]'
            : '[overflow-clip-margin:var(--spacing)]'
        )}
      >
        {children}
      </div>
    </div>
  )
}
