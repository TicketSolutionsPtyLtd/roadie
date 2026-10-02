import type { ComponentProps } from 'react'

import type { TableColumn, TableRow } from '@oztix/roadie-core/dashboard'

import { DataTableSortable } from './DataTableSortable'
import { DataTableView } from './DataTableView'
import {
  type DataTableSort,
  type DataTableSortDirection,
  isSortableColumn,
  nextSortDirection
} from './sort'

export type DataTableColumn = TableColumn
export type DataTableRow = TableRow
export type { DataTableSort, DataTableSortDirection }
export { sortDataTableRows } from './sort'

export type DataTableProps = Omit<ComponentProps<'div'>, 'children'> & {
  columns: readonly DataTableColumn[]
  rows: readonly DataTableRow[]
  /** Accessible name for the table. */
  caption?: string
  getRowKey?: (row: DataTableRow, index: number) => string
  /**
   * Links a row to its own page. The title cell (the pinned text column, or
   * else the first text column) becomes the link, routed through
   * `RoadieProvider`, and the whole row follows it when pressed.
   */
  getRowHref?: (row: DataTableRow) => string | undefined
  /** Sorts rows in the browser when a header is pressed. */
  sortable?: boolean
  /** The sorted column. Pass with `onSortChange` to control it. */
  sort?: DataTableSort
  /** The column sorted first, when `sortable` and uncontrolled. */
  defaultSort?: DataTableSort
  /** Called with the new sort when a header is pressed. */
  onSortChange?: (sort: DataTableSort) => void
  /**
   * Links headers for server sorting. The server returns rows in the new
   * order, so `rows` render as given. Takes precedence over `sortable`.
   */
  getSortHref?: (key: string, direction: DataTableSortDirection) => string
  /** @default 'Show all columns' */
  showAllLabel?: string
  /** Plain numbers only, for a chart's table view. */
  plain?: boolean
}

export function DataTable({
  rows,
  getRowKey = (_, index) => String(index),
  getRowHref,
  sortable = false,
  sort,
  defaultSort,
  onSortChange,
  getSortHref,
  showAllLabel = 'Show all columns',
  plain = false,
  ...props
}: DataTableProps) {
  // Keys and hrefs are resolved here so a server component never hands the
  // client table a function.
  const keyedRows = rows.map((row, index) => ({
    key: getRowKey(row, index),
    row,
    href: getRowHref?.(row)
  }))
  const shared = { ...props, rows: keyedRows, showAllLabel, plain }

  if (getSortHref)
    return (
      <DataTableView
        {...shared}
        sort={sort}
        sortControl={(column) =>
          isSortableColumn(column)
            ? {
                href: getSortHref(column.key, nextSortDirection(column, sort))
              }
            : undefined
        }
      />
    )
  if (sortable)
    return (
      <DataTableSortable
        {...shared}
        sort={sort}
        defaultSort={defaultSort}
        onSortChange={onSortChange}
      />
    )
  return <DataTableView {...shared} sort={sort} />
}
DataTable.displayName = 'DataTable'
