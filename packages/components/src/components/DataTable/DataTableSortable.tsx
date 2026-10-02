'use client'

import { useState } from 'react'

import { DataTableView, type DataTableViewProps } from './DataTableView'
import {
  type DataTableSort,
  isSortableColumn,
  nextSortDirection,
  sortedRowOrder
} from './sort'

export type DataTableSortableProps = Omit<DataTableViewProps, 'sortControl'> & {
  defaultSort?: DataTableSort
  onSortChange?: (sort: DataTableSort) => void
}

export function DataTableSortable({
  rows,
  columns,
  sort: controlledSort,
  defaultSort,
  onSortChange,
  ...props
}: DataTableSortableProps) {
  const [uncontrolledSort, setUncontrolledSort] = useState(defaultSort)
  const sort = controlledSort ?? uncontrolledSort
  const order = sortedRowOrder(
    rows.map(({ row }) => row),
    columns,
    sort
  )
  return (
    <DataTableView
      {...props}
      columns={columns}
      rows={order.map((index) => rows[index]!)}
      sort={sort}
      sortControl={(column) =>
        isSortableColumn(column)
          ? {
              onSort: () => {
                const next = {
                  key: column.key,
                  direction: nextSortDirection(column, sort)
                }
                setUncontrolledSort(next)
                onSortChange?.(next)
              }
            }
          : undefined
      }
    />
  )
}
