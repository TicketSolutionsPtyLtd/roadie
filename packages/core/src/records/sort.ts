import { fieldIndex, recordFieldOptions } from './fields'
import { epochSpan, isEmptyValue, read, rowZone } from './match'
import type { RecordField, RecordSort } from './types'

type SortKey = number | string | undefined

const collator = new Intl.Collator('en-AU', {
  numeric: true,
  sensitivity: 'base'
})

/** Whether an option field's status map orders its keys, so it sorts by order rather than label. */
function sortsByOrder(field: RecordField) {
  return Object.values(field.status ?? {}).some(
    (status) => status.order !== undefined
  )
}

function keyReader(
  field: RecordField,
  timeZone: string
): (row: object) => SortKey {
  switch (field.type) {
    case 'number':
    case 'money':
      return (row) => {
        const value = read(row, field.key)
        return typeof value === 'number' && Number.isFinite(value)
          ? value
          : undefined
      }
    case 'boolean':
      return (row) => {
        const value = read(row, field.key)
        return typeof value === 'boolean' ? Number(value) : undefined
      }
    case 'date':
      return (row) => {
        const value = read(row, field.key)
        if (isEmptyValue(value)) return undefined
        return epochSpan(value, rowZone(row, field, timeZone))?.[0]
      }
    case 'option': {
      if (field.status && sortsByOrder(field)) {
        const status = field.status
        return (row) => {
          const value = read(row, field.key)
          return typeof value === 'string' && Object.hasOwn(status, value)
            ? status[value]!.order
            : undefined
        }
      }
      const labels = new Map(
        recordFieldOptions(field).map((option) => [option.value, option.label])
      )
      return (row) => {
        const value = read(row, field.key)
        if (isEmptyValue(value)) return undefined
        return labels.get(value as string) ?? String(value)
      }
    }
    case 'text':
      return (row) => {
        const value = read(row, field.key)
        return isEmptyValue(value) ? undefined : String(value)
      }
  }
}

function compare(left: SortKey, right: SortKey) {
  return typeof left === 'number' && typeof right === 'number'
    ? left - right
    : collator.compare(String(left), String(right))
}

/**
 * Sorts rows by a query's sort, the browser-mode counterpart of an index's
 * sort. Text and labels compare as people read them (`9` before `10`, case
 * ignored), statuses with an `order` by it, dates by instant. Empty values
 * sit last whichever way a field runs, and ties keep the given order.
 * Fields it doesn't know are skipped.
 */
export function sortRecords<Row extends object>(
  rows: readonly Row[],
  sort: readonly RecordSort[],
  fields: readonly RecordField[],
  { timeZone }: { timeZone: string }
): Row[] {
  const byKey = fieldIndex(fields)
  const readers = sort.flatMap(({ field, direction }) => {
    const definition = byKey.get(field)
    return definition
      ? [
          {
            read: keyReader(definition, timeZone),
            sign: direction === 'ascending' ? 1 : -1
          }
        ]
      : []
  })
  if (!readers.length) return [...rows]
  const keyed = rows.map((row, index) => ({
    row,
    index,
    keys: readers.map(({ read }) => read(row))
  }))
  keyed.sort((a, b) => {
    for (let i = 0; i < readers.length; i++) {
      const left = a.keys[i]
      const right = b.keys[i]
      if (left === undefined || right === undefined) {
        if (left !== right) return left === undefined ? 1 : -1
        continue
      }
      const compared = compare(left, right) * readers[i]!.sign
      if (compared !== 0) return compared
    }
    return a.index - b.index
  })
  return keyed.map(({ row }) => row)
}
