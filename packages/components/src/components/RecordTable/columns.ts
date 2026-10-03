import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import type { RecordTableColumn, RecordTableColumnOptions } from './types'

/** Builds table columns from an entity's fields: each column presents one field. */
export function tableColumns<Row extends object = Record<string, unknown>>(
  fields: readonly RecordField[]
) {
  return {
    field<Key extends keyof Row & string>(
      key: Key,
      options: RecordTableColumnOptions<Row> = {}
    ): RecordTableColumn<Row> {
      const field = fields.find((candidate) => candidate.key === key)
      if (!field) throw new Error(`tableColumns: no field "${key}"`)
      return { key, field, ...options }
    }
  }
}

/** The columns a view shows, in its order. Pinned columns stay first and shown. */
export function shownColumns<Column extends { key: string; pin?: boolean }>(
  columns: readonly Column[],
  layout: RecordLayout
): Column[] {
  const settings = layout.type === 'table' ? layout.columns : undefined
  const hidden = new Set(settings?.hidden)
  const rank = new Map(settings?.order?.map((key, index) => [key, index]))
  const unranked = rank.size
  const pinned = columns.filter((column) => column.pin)
  const rest = columns
    .filter((column) => !column.pin && !hidden.has(column.key))
    .map((column, index) => ({
      column,
      rank: rank.get(column.key) ?? unranked + index
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ column }) => column)
  return [...pinned, ...rest]
}
