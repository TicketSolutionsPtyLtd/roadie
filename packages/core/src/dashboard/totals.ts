import type { TableCell, TableColumn, TableRow } from './schema'

/**
 * A table's totals row. `'sum'` adds up its count and currency columns over
 * every row. With `values`, nothing is summed; give a `label` with them, since
 * the rows may be only a page. Without one, the row reads "Totals".
 */
export type TableTotals =
  'sum' | { label?: string; values?: Record<string, TableCell> }

export type ResolvedTotals = {
  label: string
  values: Record<string, TableCell>
}

export type RecordName = { one: string; other: string }

// Shares, indexes and points don't add up.
const SUMMABLE_FORMATS = new Set([
  undefined,
  'number',
  'compact',
  'currency',
  'compactCurrency'
])
const CURRENCY_FORMATS = new Set(['currency', 'compactCurrency'])

/** Whether a totals row sums this column: a count or an amount that hasn't set `total: false`. */
export const isSummable = (column: TableColumn) =>
  column.kind === 'number' &&
  column.total !== false &&
  SUMMABLE_FORMATS.has(column.format)

const count = new Intl.NumberFormat('en-AU')

function sum(column: TableColumn, rows: readonly TableRow[]) {
  let total = 0
  let any = false
  for (const row of rows) {
    const value = row[column.key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    total += value
    any = true
  }
  if (!any) return undefined
  // Float sums drift, as 0.1 + 0.2 does; money adds up to the cent.
  return CURRENCY_FORMATS.has(column.format ?? '')
    ? (Math.sign(total) * Math.round(Math.abs(total) * 100)) / 100
    : total
}

/** A totals row's label and values: the number columns summed over every row, unless it gives its own values. */
export function resolveTableTotals(
  columns: readonly TableColumn[],
  rows: readonly TableRow[],
  totals: TableTotals,
  recordName: RecordName = { one: 'record', other: 'records' }
): ResolvedTotals {
  const given = totals === 'sum' ? {} : totals
  // Values come from elsewhere, so the rows here may not be the ones counted.
  if (given.values)
    return { label: given.label ?? 'Totals', values: given.values }
  const label =
    given.label ??
    `Totals for ${count.format(rows.length)} ${rows.length === 1 ? recordName.one : recordName.other}`
  const values: Record<string, TableCell> = Object.create(null)
  for (const column of columns) {
    if (!isSummable(column)) continue
    const total = sum(column, rows)
    if (total !== undefined) values[column.key] = total
  }
  return { label, values }
}
