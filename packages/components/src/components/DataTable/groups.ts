import type {
  TableCell,
  TableColumn,
  TableRow
} from '@oztix/roadie-core/dashboard'
import {
  isSummable,
  resolveTableTotals
} from '@oztix/roadie-core/dashboard-layout'

import { isDev } from '../../utils/isDev'
import {
  type DataTableSort,
  type KeyedRow,
  cellOf,
  sortedRowOrder
} from './sort'

/** Opens every group with `true`, or the groups at these paths of values, outermost first. */
export type DataTableExpanded = boolean | readonly (readonly string[])[]

export type DataTableGroupNode = {
  kind: 'group'
  key: string
  depth: number
  column: TableColumn
  value: TableCell | undefined
  values: Record<string, TableCell>
  children: readonly DataTableNode[]
}
export type DataTableLeafNode = { kind: 'row'; depth: number; row: KeyedRow }
export type DataTableNode = DataTableGroupNode | DataTableLeafNode

const warned = new Set<string>()

function warnGroupBy(key: string, reason: string) {
  if (warned.has(key) || !isDev()) return
  warned.add(key)
  console.warn(
    `[Roadie] DataTable groupBy "${key}" ${reason}, so it's ignored.`
  )
}

const isGroupable = (column: TableColumn) =>
  column.kind === 'text' || column.kind === 'status'

/** The `groupBy` columns a table can group by, in order, warning about the rest. */
export function groupColumnsOf(
  columns: readonly TableColumn[],
  groupBy: readonly string[] | undefined
): TableColumn[] {
  if (!groupBy?.length) return []
  const grouped: TableColumn[] = []
  for (const key of groupBy) {
    const column = columns.find((candidate) => candidate.key === key)
    if (!column) warnGroupBy(key, 'names no column')
    else if (!isGroupable(column))
      warnGroupBy(key, 'is not a text or status column')
    else if (!grouped.includes(column)) grouped.push(column)
  }
  if (grouped.length === columns.length) {
    warnGroupBy(groupBy.join(', '), 'leaves no column to show')
    return []
  }
  return grouped
}

/** The column for the totals and group labels: the first one a total never fills, else the first. */
export const labelIndexOf = (columns: readonly TableColumn[]) =>
  Math.max(
    0,
    columns.findIndex((column) => !isSummable(column))
  )

export const groupKey = (path: readonly string[]) => JSON.stringify(path)

const pathValue = (cell: TableCell | undefined) =>
  cell === null || cell === undefined ? '' : String(cell)

// A group sorts as a row holding its sums, with its label in the label column.
function sortGroups(
  groups: DataTableGroupNode[],
  columns: readonly TableColumn[],
  groupColumn: TableColumn,
  sort: DataTableSort | undefined
) {
  const labelColumn = columns[labelIndexOf(columns)]
  if (!sort || !labelColumn) return groups
  const rows: TableRow[] = groups.map((group) => ({
    ...group.values,
    [labelColumn.key]: group.value ?? null
  }))
  const sortColumns = columns.map((column) =>
    column === labelColumn ? { ...groupColumn, key: labelColumn.key } : column
  )
  return sortedRowOrder(rows, sortColumns, sort).map((index) => groups[index]!)
}

export function buildGroups(
  rows: readonly KeyedRow[],
  columns: readonly TableColumn[],
  groupColumns: readonly TableColumn[],
  sort: DataTableSort | undefined,
  path: readonly string[] = []
): DataTableNode[] {
  const depth = path.length
  const [column, ...rest] = groupColumns
  if (!column) return rows.map((row) => ({ kind: 'row', depth, row }))
  const members = new Map<string, KeyedRow[]>()
  for (const row of rows) {
    const value = pathValue(cellOf(row.row, column.key))
    const bucket = members.get(value)
    if (bucket) bucket.push(row)
    else members.set(value, [row])
  }
  const groups = [...members].map(([value, grouped]): DataTableGroupNode => ({
    kind: 'group',
    key: groupKey([...path, value]),
    depth,
    column,
    // Empty, null and missing share a group, labelled as missing.
    value: value === '' ? null : cellOf(grouped[0]!.row, column.key),
    values: resolveTableTotals(
      columns,
      grouped.map(({ row }) => row),
      'sum'
    ).values,
    children: buildGroups(grouped, columns, rest, sort, [...path, value])
  }))
  return sortGroups(groups, columns, column, sort)
}

export type DataTableEntry = { node: DataTableNode; collapsed: boolean }

/** Every row, each collapsed while any group above it is closed. */
export function flattenNodes(
  nodes: readonly DataTableNode[],
  isOpen: (key: string) => boolean,
  collapsed = false
): DataTableEntry[] {
  return nodes.flatMap((node) => [
    { node, collapsed },
    ...(node.kind === 'group'
      ? flattenNodes(node.children, isOpen, collapsed || !isOpen(node.key))
      : [])
  ])
}
