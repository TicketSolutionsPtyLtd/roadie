import type { ComponentProps } from 'react'

import type { TableColumn, TableRow } from '@oztix/roadie-core/dashboard'
import { cn } from '@oztix/roadie-core/utils'

import { Table } from '../Table'
import { DataTableCellContent } from './DataTableCell'
import { DataTableShowAll } from './DataTableShowAll'

export type DataTableColumn = TableColumn
export type DataTableRow = TableRow
export type DataTableSortDirection = 'ascending' | 'descending'
export type DataTableSort = { key: string; direction: DataTableSortDirection }

export type DataTableProps = Omit<ComponentProps<'div'>, 'children'> & {
  columns: readonly DataTableColumn[]
  rows: readonly DataTableRow[]
  /** Accessible name for the table. */
  caption?: string
  getRowKey?: (row: DataTableRow, index: number) => string
  sort?: DataTableSort
  /** Makes headers sortable. The server returns rows in the new order. */
  getSortHref?: (key: string, direction: DataTableSortDirection) => string
  /** @default 'Show all columns' */
  showAllLabel?: string
  /** Plain numbers only, for a chart's table view. */
  plain?: boolean
}

const alignOf = (column: DataTableColumn): 'start' | 'end' =>
  column.kind === 'number' || column.kind === 'delta' ? 'end' : 'start'

const nextDirection = (
  sort: DataTableSort | undefined,
  key: string
): DataTableSortDirection =>
  sort?.key === key && sort.direction === 'ascending'
    ? 'descending'
    : 'ascending'

function HeaderLabel({
  column,
  sort,
  getSortHref
}: {
  column: DataTableColumn
  sort?: DataTableSort
  getSortHref?: DataTableProps['getSortHref']
}) {
  if (!getSortHref) return column.header
  return (
    <a
      href={getSortHref(column.key, nextDirection(sort, column.key))}
      className='underline-offset-4 hover:underline'
    >
      {column.header}
    </a>
  )
}

export function DataTable({
  columns,
  rows,
  caption,
  getRowKey = (_, index) => String(index),
  sort,
  getSortHref,
  showAllLabel = 'Show all columns',
  plain = false,
  className,
  ...props
}: DataTableProps) {
  const hasPriorities = columns.some((column) => column.priority !== undefined)
  const cellAttributes = (column: DataTableColumn) => ({
    'data-priority': column.priority,
    'data-pin': column.pin || undefined,
    align: alignOf(column)
  })
  return (
    <div
      data-slot='data-table'
      className={cn('grid gap-2', className)}
      {...props}
    >
      <div data-slot='data-table-scroller'>
        <Table>
          {caption && <caption className='sr-only'>{caption}</caption>}
          <Table.Head>
            <Table.Row>
              {columns.map((column) => (
                <Table.HeaderCell
                  key={column.key}
                  {...cellAttributes(column)}
                  aria-sort={
                    sort?.key === column.key ? sort.direction : undefined
                  }
                >
                  <HeaderLabel
                    column={column}
                    sort={sort}
                    getSortHref={getSortHref}
                  />
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map((row, index) => (
              <Table.Row key={getRowKey(row, index)}>
                {columns.map((column) => (
                  <Table.Cell key={column.key} {...cellAttributes(column)}>
                    <DataTableCellContent
                      column={column}
                      value={row[column.key]}
                      secondary={
                        column.secondaryKey
                          ? row[column.secondaryKey]
                          : undefined
                      }
                      plain={plain}
                    />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      {hasPriorities && <DataTableShowAll label={showAllLabel} />}
    </div>
  )
}
DataTable.displayName = 'DataTable'
