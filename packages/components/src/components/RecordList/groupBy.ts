import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import { groupableFields } from '../Records/groups'

/** The fields a list view groups by, outermost first, leaving out any that can't group and every level after one that can't. */
export function listGroupFields(
  fields: readonly RecordField[],
  layout: RecordLayout
): RecordField[] {
  const levels = layout.type === 'list' ? (layout.groupBy ?? []) : []
  const groupable = groupableFields(fields)
  const found: RecordField[] = []
  for (const key of levels) {
    const field = groupable.find((one) => one.key === key)
    if (!field || found.includes(field)) break
    found.push(field)
  }
  return found
}

/** The list layout grouped by `levels`, outermost first, or not at all when there are none, keeping its fields. */
export function listGroupLevelsLayout(
  current: RecordLayout,
  levels: readonly string[]
): RecordLayout {
  const fields = current.type === 'list' ? current.fields : undefined
  return {
    type: 'list',
    ...(fields && { fields }),
    ...(levels.length > 0 && { groupBy: [...levels] })
  }
}
