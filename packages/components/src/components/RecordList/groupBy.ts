import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import { groupableFields } from '../Records/groups'

/** The field a list view groups by, from its `groupBy`, when that field can group. */
export function listGroupField(
  fields: readonly RecordField[],
  layout: RecordLayout
): RecordField | undefined {
  if (layout.type !== 'list' || !layout.groupBy) return undefined
  return groupableFields(fields).find((field) => field.key === layout.groupBy)
}
