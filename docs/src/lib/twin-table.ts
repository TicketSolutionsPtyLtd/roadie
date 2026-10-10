/** A run of text, or of code, inside a table cell. */
export type TwinSegment = string | { code: string }

export type TwinCell = string | TwinSegment[]

/** A table a docs component draws and its markdown twin writes, built once from the same data. */
export type TwinTable = { head: string[]; rows: TwinCell[][] }

export const segments = (cell: TwinCell): TwinSegment[] =>
  typeof cell === 'string' ? [cell] : cell

/** A cell's text as the page shows it. */
export const cellText = (cell: TwinCell) =>
  segments(cell)
    .map((segment) => (typeof segment === 'string' ? segment : segment.code))
    .join('')
