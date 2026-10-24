import type {
  ResolvedTotals,
  TableColumn,
  TableRow,
  TableTotals
} from '@oztix/roadie-core/dashboard'
import {
  isSummable,
  resolveTableTotals
} from '@oztix/roadie-core/dashboard-layout'
import type { RecordField } from '@oztix/roadie-core/records'

import type { RecordsRow } from './types'

/** Totals a server gives: each field's value, by key, and the row's label. */
export type RecordsGivenTotals = Exclude<TableTotals, 'sum'>
/** `true` or `'sum'` adds up every match in the browser; values come from a server. */
export type RecordsTotals = true | TableTotals
export type { ResolvedTotals as RecordsResolvedTotals }

// Rows may name their own currencies, which don't add up.
const totalColumn = (field: RecordField): TableColumn | undefined =>
  (field.type === 'number' || field.type === 'money') && !field.currencyKey
    ? {
        key: field.key,
        header: field.label,
        kind: 'number',
        format:
          field.format ?? (field.type === 'money' ? 'currency' : undefined)
      }
    : undefined

/** Whether totals sum this field, by core's totals rules. */
export const isSummedField = (field: RecordField) => {
  const column = totalColumn(field)
  return !!column && isSummable(column)
}

const summableColumns = (fields: readonly RecordField[]) =>
  fields.flatMap((field) => totalColumn(field) ?? [])

/** Sums every number and money field over the matching records, by core's totals rules. */
export function sumRecords(
  fields: readonly RecordField[],
  rows: readonly RecordsRow<object>[],
  label: string
): ResolvedTotals {
  return resolveTableTotals(
    summableColumns(fields),
    rows.map(({ row }) => row as TableRow),
    { label }
  )
}
