import type { GridLayoutConfig } from '../RecordGrid/types'

/** The field that makes the columns, which field each part of a card shows, and where moves go. */
export type BoardLayoutConfig<Row extends object = Record<string, unknown>> =
  Omit<GridLayoutConfig<Row>, 'image'> & {
    /** The option field whose options make the columns, until a view picks another. */
    groupBy: keyof Row & string
    /** Called when a card moves to another column, with that column's option value, or null for "No <field>". Reject, with a message people can read, to put the card back. Without it, cards don't move. */
    onMove?: (row: Row, value: string | null) => void | Promise<unknown>
  }
