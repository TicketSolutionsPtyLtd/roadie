import type { ReactNode } from 'react'

import type { RecordCellContext } from '../Records/types'

/** One part of a card: a field's key, or the key with how to show it. */
export type GridPartOption<Row extends object = Record<string, unknown>> =
  | (keyof Row & string)
  | {
      key: keyof Row & string
      /** An image's alt text. Empty by default, as the card's title names it. */
      alt?: (row: Row) => string
      /** Replaces the field's own rendering. */
      cell?: (context: RecordCellContext<Row>) => ReactNode
    }

/** Which field each part of a card shows. */
export type GridLayoutConfig<Row extends object = Record<string, unknown>> = {
  /** Names the record and carries its link. */
  title?: GridPartOption<Row>
  /** Under the title. */
  description?: GridPartOption<Row>
  /** A 16:9 banner across the card's top, from an image URL. */
  image?: GridPartOption<Row>
  /** Beside the title, such as an avatar. */
  leading?: GridPartOption<Row>
  /** At the end of the title, or over the banner, such as a status. */
  trailing?: GridPartOption<Row>
  /** Label and value pairs under the title, in order. People can show other fields, hide these and reorder them. */
  details?: readonly GridPartOption<Row>[]
}
