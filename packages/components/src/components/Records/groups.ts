import {
  type RecordField,
  recordFieldOptions
} from '@oztix/roadie-core/records'

import type { RecordsRow } from './types'

export type RecordGroup<Row = object> = {
  /** The option's value, or null for records with none. */
  key: string | null
  label: string
  /** Every record in the group, at any depth. */
  rows: RecordsRow<Row>[]
  /** The field the group's level groups by. */
  field?: RecordField
  /** The next level's groups, when the view groups by another field. */
  groups?: RecordGroup<Row>[]
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

const isBlank = (value: unknown) =>
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

/**
 * Records grouped by each field in turn, outermost first: each group holds its
 * records and, below the last level, the next field's groups of them. Every
 * level keeps empty groups, as `groupRecords` does.
 */
export function groupRecordsBy<Row>(
  rows: readonly RecordsRow<Row>[],
  fields: readonly RecordField[]
): RecordGroup<Row>[] {
  const [field, ...inner] = fields
  if (!field) return []
  return groupRecords(rows, field).map((group) => ({
    ...group,
    field,
    ...(inner.length > 0 && { groups: groupRecordsBy(group.rows, inner) })
  }))
}
