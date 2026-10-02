import type {
  TableCell,
  TableColumn,
  TableRow
} from '@oztix/roadie-core/dashboard'

export type DataTableSortDirection = 'ascending' | 'descending'
export type DataTableSort = { key: string; direction: DataTableSortDirection }

export const isSortableColumn = (column: TableColumn) =>
  column.kind !== 'sparkline'

export const nextSortDirection = (
  column: TableColumn,
  sort: DataTableSort | undefined
): DataTableSortDirection => {
  if (sort?.key === column.key)
    return sort.direction === 'ascending' ? 'descending' : 'ascending'
  return column.kind === 'text' ? 'ascending' : 'descending'
}

const collator = new Intl.Collator('en-AU', {
  numeric: true,
  sensitivity: 'base'
})

export const compareText = (a: string, b: string) => collator.compare(a, b)

export const sortValue = (column: TableColumn, cell: TableCell | undefined) => {
  if (column.kind === 'text')
    return cell === null || cell === undefined ? undefined : String(cell)
  return typeof cell === 'number' && Number.isFinite(cell) ? cell : undefined
}

export function sortedRowOrder(
  rows: readonly TableRow[],
  columns: readonly TableColumn[],
  sort: DataTableSort | undefined
): number[] {
  const order = rows.map((_, index) => index)
  const column = columns.find((candidate) => candidate.key === sort?.key)
  if (!sort || !column || !isSortableColumn(column)) return order

  const values = rows.map((row) => sortValue(column, row[column.key]))
  const sign = sort.direction === 'ascending' ? 1 : -1
  return order.sort((a, b) => {
    const left = values[a]
    const right = values[b]
    // Missing values sit at the bottom whichever way the column runs.
    if (left === undefined || right === undefined)
      return Number(left === undefined) - Number(right === undefined)
    const compared =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : compareText(String(left), String(right))
    return compared * sign
  })
}

/** Sorts rows the way a sortable `DataTable` does, for server-sorted tables. */
export const sortDataTableRows = <Row extends TableRow>(
  rows: readonly Row[],
  columns: readonly TableColumn[],
  sort: DataTableSort | undefined
): Row[] => sortedRowOrder(rows, columns, sort).map((index) => rows[index]!)
