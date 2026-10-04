import type { RecordCardParts } from '../Records/types'
import { titleColumn } from './RecordTableRow'
import type { RecordTableColumn, RecordTableNarrow } from './types'

/** How a table under 40rem shows its records. */
export type RecordTableNarrowLayout = 'list' | 'cards'

export const narrowLayout = (
  columns: readonly RecordTableColumn[]
): RecordTableNarrowLayout =>
  columns.some((column) => column.narrow === 'detail') ? 'cards' : 'list'

/** Each narrow role's column; the title is never repeated in another role. */
export function narrowParts(
  columns: readonly RecordTableColumn[]
): RecordCardParts {
  const title = titleColumn(columns)
  const rest = columns.filter((column) => column !== title)
  const first = (role: RecordTableNarrow) =>
    rest.find((column) => column.narrow === role)
  return {
    title,
    description: first('description'),
    leading: first('leading'),
    trailing: first('trailing'),
    details: rest.filter((column) => column.narrow === 'detail')
  }
}
