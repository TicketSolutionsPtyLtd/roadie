import type { RecordCardParts } from '../Records/types'
import { titleColumn } from './RecordTableRow'
import type { RecordTableColumn, RecordTableNarrow } from './types'

/** How a table under 40rem shows its records. */
export type RecordTableNarrowLayout = 'list' | 'cards'

export const narrowLayout = (
  columns: readonly RecordTableColumn<never>[]
): RecordTableNarrowLayout =>
  columns.some((column) => column.narrow === 'detail') ? 'cards' : 'list'

/** A card's parts: an image leading a list row becomes the card's banner. */
export const cardParts = <Row extends object>(
  parts: RecordCardParts<Row>
): RecordCardParts<Row> =>
  parts.leading?.kind === 'image'
    ? { ...parts, image: parts.leading, leading: undefined }
    : parts

/** Each narrow role's column; the title is never repeated in another role. */
export function narrowParts<Row extends object>(
  columns: readonly RecordTableColumn<Row>[]
): RecordCardParts<Row> {
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
