import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import { listGroupFields } from '../RecordList/groupBy'

/** The fields a grid view groups by, outermost first, by the list's rules. */
export const gridGroupFields = (
  fields: readonly RecordField[],
  layout: RecordLayout
): RecordField[] =>
  layout.type === 'grid' && layout.groupBy
    ? listGroupFields(fields, { type: 'list', groupBy: layout.groupBy })
    : []

/** The grid layout grouped by `levels`, outermost first, or not at all when there are none, keeping its fields. */
export function gridGroupLevelsLayout(
  current: RecordLayout,
  levels: readonly string[]
): RecordLayout {
  const fields = current.type === 'grid' ? current.fields : undefined
  return {
    type: 'grid',
    ...(fields && { fields }),
    ...(levels.length > 0 && { groupBy: [...levels] })
  }
}
