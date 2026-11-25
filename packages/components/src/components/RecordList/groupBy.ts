import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import { groupableFields } from '../Records/groups'

/** The field a list view groups by, from its first `groupBy` level, when that field can group. */
export function listGroupField(
  fields: readonly RecordField[],
  layout: RecordLayout
): RecordField | undefined {
  const key = layout.type === 'list' ? layout.groupBy?.[0] : undefined
  if (!key) return undefined
  return groupableFields(fields).find((field) => field.key === key)
}

/** The list layout grouped first by `key`, or not at all, keeping its fields and its other levels. */
export function listGroupLayout(
  current: RecordLayout,
  key: string | undefined
): RecordLayout {
  const fields = current.type === 'list' ? current.fields : undefined
  const rest =
    current.type === 'list'
      ? (current.groupBy ?? []).slice(1).filter((level) => level !== key)
      : []
  return {
    type: 'list',
    ...(fields && { fields }),
    ...(key && { groupBy: [key, ...rest] })
  }
}
