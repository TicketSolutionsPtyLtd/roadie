import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import { groupableFields } from '../Records/groups'
import type { ListLayoutConfig } from './types'

/** The field a list view groups by: its own `groupBy`, else the definition's, when that field can group. */
export function listGroupField(
  config: ListLayoutConfig,
  fields: readonly RecordField[],
  layout: RecordLayout
): RecordField | undefined {
  const groupable = groupableFields(fields)
  const find = (key: string | undefined) =>
    groupable.find((field) => field.key === key)
  const own = layout.type === 'list' ? find(layout.groupBy) : undefined
  return own ?? find(config.groupBy)
}
