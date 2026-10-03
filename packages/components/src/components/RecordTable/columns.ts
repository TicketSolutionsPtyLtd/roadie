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

type Column = { key: string; pin?: boolean }

/** Columns that aren't pinned, in the view's order: the ones it names first, the rest as defined. */
function orderedColumns<C extends Column>(
  columns: readonly C[],
  order: readonly string[] | undefined
): C[] {
  const rank = new Map(order?.map((key, index) => [key, index]))
  const unranked = rank.size
  return columns
    .filter((column) => !column.pin)
    .map((column, index) => ({
      column,
      rank: rank.get(column.key) ?? unranked + index
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ column }) => column)
}

const tableSettings = (layout: RecordLayout) =>
  layout.type === 'table' ? layout.columns : undefined

/** The columns a view shows, in its order. Pinned columns stay first and shown. */
export function shownColumns<C extends Column>(
  columns: readonly C[],
  layout: RecordLayout
): C[] {
  const settings = tableSettings(layout)
  const hidden = new Set(settings?.hidden)
  return [
    ...columns.filter((column) => column.pin),
    ...orderedColumns(columns, settings?.order).filter(
      (column) => !hidden.has(column.key)
    )
  ]
}

/** What a view does with each column: pinned ones apart, the rest in its order, hidden ones kept in place. */
export function columnSettings<C extends Column>(
  columns: readonly C[],
  layout: RecordLayout
): { pinned: C[]; columns: { column: C; hidden: boolean }[] } {
  const settings = tableSettings(layout)
  const hidden = new Set(settings?.hidden)
  return {
    pinned: columns.filter((column) => column.pin),
    columns: orderedColumns(columns, settings?.order).map((column) => ({
      column,
      hidden: hidden.has(column.key)
    }))
  }
}

/**
 * A table layout that orders and hides these columns, leaving out whatever
 * matches the columns as defined, so a view put back compares equal.
 */
export function tableColumnsLayout(
  columns: readonly Column[],
  { order, hidden }: { order: readonly string[]; hidden: readonly string[] }
): RecordLayout {
  const ordered = orderedColumns(columns, order).map((column) => column.key)
  const defined = columns.filter((column) => !column.pin)
  const moved = ordered.some((key, index) => key !== defined[index]!.key)
  const hiding = new Set(hidden)
  const hiddenKeys = defined
    .filter((column) => hiding.has(column.key))
    .map((column) => column.key)
  const settings = {
    ...(moved && { order: ordered }),
    ...(hiddenKeys.length > 0 && { hidden: hiddenKeys })
  }
  return Object.keys(settings).length > 0
    ? { type: 'table', columns: settings }
    : { type: 'table' }
}
