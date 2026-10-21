import type {
  ResolvedTotals,
  TableColumn,
  TableRow,
  TableTotals
} from '@oztix/roadie-core/dashboard'
import { resolveTableTotals } from '@oztix/roadie-core/dashboard-layout'
import type { RecordField } from '@oztix/roadie-core/records'

import { formatCount } from './count'
import type { RecordName, RecordsRow } from './types'

/** Totals a server gives: each field's value, by key, and the row's label. */
export type RecordsGivenTotals = Exclude<TableTotals, 'sum'>
/** `true` or `'sum'` adds up every match in the browser; values come from a server. */
export type RecordsTotals = true | TableTotals
export type { ResolvedTotals as RecordsResolvedTotals }

// Rows may name their own currencies, which don't add up.
const summableColumns = (fields: readonly RecordField[]): TableColumn[] =>
  fields.flatMap((field) =>
    (field.type === 'number' || field.type === 'money') && !field.currencyKey
      ? [
          {
            key: field.key,
            header: field.label,
            kind: 'number',
            format:
              field.format ?? (field.type === 'money' ? 'currency' : undefined)
          }
        ]
      : []
  )

export const totalsLabel = (
  count: number,
  exact: boolean,
  { one, other }: RecordName
) => `Totals for ${formatCount(count, exact)} ${count === 1 ? one : other}`

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
