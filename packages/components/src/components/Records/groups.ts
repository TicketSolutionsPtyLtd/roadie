import {
  type RecordField,
  recordFieldOptions
} from '@oztix/roadie-core/records'

import type { RecordsRow } from './types'

export type RecordGroup<Row = object> = {
  /** The option's value, or null for records with none. */
  key: string | null
  label: string
  rows: RecordsRow<Row>[]
}

/** Fields a layout can group by: one value per record, from a set of options. Core's `validateRecordView` holds `groupBy` to the same rule. */
export const groupableFields = (fields: readonly RecordField[]) =>
  fields.filter(
    (field) => !field.multiple && recordFieldOptions(field).length > 0
  )

/** The group for records with no value, as in "No status". */
export const noneLabel = (field: RecordField) =>
  // Mid-sentence, so "Venue ID" reads "No venue ID".
  `No ${field.label.replace(/^[A-Z](?=[a-z])/, (first) => first.toLowerCase())}`

export const isBlank = (value: unknown) =>
  value === undefined || value === null || value === ''

/**
 * Records by their value of a field, one group per option in option order,
 * empty ones included, keeping the rows' order inside each. Values that
 * aren't options follow, then a "No <field>" group when any record has none.
 */
export function groupRecords<Row>(
  rows: readonly RecordsRow<Row>[],
  field: RecordField
): RecordGroup<Row>[] {
  const groups = new Map<string | null, RecordGroup<Row>>(
    recordFieldOptions(field).map(({ value, label }) => [
      value,
      { key: value, label, rows: [] }
    ])
  )
  const none: RecordGroup<Row> = {
    key: null,
    label: noneLabel(field),
    rows: []
  }
  for (const record of rows) {
    const value = (record.row as Record<string, unknown>)[field.key]
    if (isBlank(value)) {
      none.rows.push(record)
      continue
    }
    const key = String(value)
    let group = groups.get(key)
    if (!group) {
      group = { key, label: key, rows: [] }
      groups.set(key, group)
    }
    group.rows.push(record)
  }
  return none.rows.length ? [...groups.values(), none] : [...groups.values()]
}
