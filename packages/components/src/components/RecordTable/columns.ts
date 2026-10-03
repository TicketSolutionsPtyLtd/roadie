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

const sameKeys = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((key, index) => key === b[index])

/**
 * The table layout after a change to the columns. An order the change doesn't
 * rearrange stays as written. A new order keeps each key for a column this
 * table doesn't have, such as one only some people see, in its slot, and is
 * left out when it is back to the columns as defined; so is an empty hidden.
 */
export function tableColumnsLayout(
  columns: readonly Column[],
  { order, hidden }: { order: readonly string[]; hidden: readonly string[] },
  current: RecordLayout
): RecordLayout {
  const settings = tableSettings(current)
  const known = new Set(columns.map((column) => column.key))
  const keys = (list: readonly Column[]) => list.map((column) => column.key)

  const ordered = keys(orderedColumns(columns, order))
  const defined = keys(columns.filter((column) => !column.pin))
  let nextOrder: readonly string[] = settings?.order ?? []
  if (!sameKeys(ordered, keys(orderedColumns(columns, settings?.order)))) {
    const queue = [...ordered]
    const movable = new Set(defined)
    // A pinned or repeated key holds no slot.
    const slotted = nextOrder.flatMap((key) =>
      !known.has(key) ? [key] : movable.delete(key) ? queue.splice(0, 1) : []
    )
    const merged = [...slotted, ...queue]
    nextOrder =
      sameKeys(ordered, defined) && merged.every((key) => known.has(key))
        ? []
        : merged
  }
  const hiding = new Set(hidden)
  const nextHidden = [
    ...defined.filter((key) => hiding.has(key)),
    ...(settings?.hidden ?? []).filter((key) => !known.has(key))
  ]
  const next = {
    ...(nextOrder.length > 0 && { order: [...nextOrder] }),
    ...(nextHidden.length > 0 && { hidden: nextHidden })
  }
  return Object.keys(next).length > 0
    ? { type: 'table', columns: next }
    : { type: 'table' }
}
