import type { CSSProperties, ComponentProps, ReactNode } from 'react'

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

export function DataTableRow({
  columns,
  row: { row, href },
  titleKey,
  plain,
  depth,
  rowProps
}: {
  columns: readonly TableColumn[]
  row: KeyedRow
  titleKey?: string
  plain: boolean
  /** A grouped row's level, which indents its label cell and lets it collapse. */
  depth?: number
  rowProps?: ComponentProps<'tr'>
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
      {...rowProps}
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
          <Table.Cell key={column.key} {...cellAttributes(column)}>
            {depth === undefined ? (
              content
            ) : (
              <DataTableCollapse>
                {index === labelIndex ? (
                  <DataTableIndent
                    depth={depth}
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
      className={cn('flex items-center gap-1', className)}
      style={{ '--data-table-depth': depth } as CSSProperties}
    >
      {children}
    </span>
  )
}

/** Shrinks a grouped cell's content to nothing while its row is collapsed. */
export function DataTableCollapse({ children }: { children: ReactNode }) {
  return (
    <div data-slot='data-table-collapse'>
      <div>{children}</div>
    </div>
  )
}
