import type { RecordPart } from '../Records/types'

export type { RecordCellContext } from '../Records/types'

/** In rem. `grow` shares out the spare width, like `fr`. */
export type RecordColumnWidth = { min: number; grow?: number }

/**
 * Where a column shows when the table is under 40rem wide and its rows turn
 * into list rows or cards. Any `detail` column makes them cards, listing
 * each detail under the title. `hidden` leaves it to the wide table.
 */
export type RecordTableNarrow =
  'title' | 'description' | 'leading' | 'trailing' | 'detail' | 'hidden'

/** How the table presents one field. */
export type RecordTableColumn<Row extends object = object> = RecordPart<Row> & {
  /** Sticks to the start while the table scrolls sideways. Pinned columns stay first and can't be hidden. */
  pin?: boolean
  /** Defaults to the column's content, or 3.75 for an image. */
  width?: RecordColumnWidth
  /** Where the column shows on narrow rows. @default 'hidden', or 'leading' for an image */
  narrow?: RecordTableNarrow
  /** Hides the column as the table narrows: 3 below 64rem, then 2 below 56rem, then 1 below 48rem. Ignored on a pinned column. */
  priority?: 1 | 2 | 3
}

export type RecordTableColumnOptions<Row extends object = object> = Omit<
  RecordTableColumn<Row>,
  'key' | 'field'
>
