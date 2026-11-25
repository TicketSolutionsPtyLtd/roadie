import type { GridLayoutConfig } from '../RecordGrid/types'

/** The grouping fields a move changed, each to an option value, or null for "No <field>". Fields it left alone are absent. */
export type RecordGroupChanges<Row extends object = Record<string, unknown>> =
  Partial<Record<keyof Row & string, string | null>>

/** The field that makes the columns, which field each part of a card shows, and where moves go. */
export type BoardLayoutConfig<Row extends object = Record<string, unknown>> =
  Omit<GridLayoutConfig<Row>, 'image'> & {
    /** The option field whose options make the columns, or two: the columns, then the lanes. A view's `groupBy` wins. */
    groupBy: (keyof Row & string) | readonly (keyof Row & string)[]
    /** Called when a card moves, with the grouping fields it changed, such as `{ status: 'sold_out' }`; null is "No <field>". Save them as a patch. Reject, with a message people can read, to put the card back. Without it, cards don't move. */
    onMove?: (
      row: Row,
      changes: RecordGroupChanges<Row>
    ) => void | Promise<unknown>
  }
