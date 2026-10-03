import { type RecordField, formatRecordValue } from '@oztix/roadie-core/records'

import { NOT_AVAILABLE } from '../Records/RecordValue'
import type { RecordColumnWidth, RecordTableColumn } from './types'

export type ColumnLayout = {
  template: string
  /** In rem. */
  minWidth: number
  /** Each pinned column's sticky offset, in rem, after any select track. */
  pinnedStart: (number | undefined)[]
}

const SAMPLE_ROWS = 200
const REM_PER_CHARACTER = 0.55
const ALWAYS_WHOLE = 16
const CELL_PADDING = 1.25
// Room for the sort caret beside a header.
const HEADER_EXTRA = 3
// A badge's padding, in characters.
const BADGE_EXTRA = 2

const cellLength = (field: RecordField, row: object, timeZone: string) => {
  const text = formatRecordValue(row, field, { timeZone })
  if (text === null) return NOT_AVAILABLE.length
  return text.length + (field.status ? BADGE_EXTRA : 0)
}

const typicalLength = (lengths: number[]) => {
  if (lengths.length === 0) return 0
  const sorted = [...lengths].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * 0.9)]!
}

const rem = (characters: number) =>
  Math.round((characters * REM_PER_CHARACTER + CELL_PADDING) * 4) / 4

/** Each column's width, sized from a sample of its content unless it sets its own. */
export function columnWidths(
  columns: readonly RecordTableColumn[],
  rows: readonly object[],
  timeZone: string
): RecordColumnWidth[] {
  const sample = rows.slice(0, SAMPLE_ROWS)
  return columns.map(({ field, width }) => {
    if (width) return width
    const header = field.label.length + HEADER_EXTRA
    const characters = Math.max(
      header,
      typicalLength(sample.map((row) => cellLength(field, row, timeZone)))
    )
    // Long text may truncate to about 60% of its typical length; short text, figures and dates never do.
    const shown =
      field.type === 'text' && characters > ALWAYS_WHOLE
        ? Math.max(ALWAYS_WHOLE, Math.round(characters * 0.6))
        : characters
    return { min: rem(Math.max(shown, header)), grow: characters }
  })
}

export const sameWidths = (
  a: readonly RecordColumnWidth[],
  b: readonly RecordColumnWidth[]
) =>
  a.length === b.length &&
  a.every(
    (width, index) =>
      width.min === b[index]!.min && width.grow === b[index]!.grow
  )

const track = ({ min, grow }: RecordColumnWidth) =>
  grow ? `minmax(${min}rem, ${grow}fr)` : `${min}rem`

/** The checkbox track, pinned first. In rem. */
export const SELECT_WIDTH = 2.5
/** The row actions track, pinned last. In rem. */
export const ACTIONS_WIDTH = 3

export function columnLayout(
  columns: readonly RecordTableColumn[],
  widths: readonly RecordColumnWidth[],
  {
    select = false,
    actions = false
  }: { select?: boolean; actions?: boolean } = {}
): ColumnLayout {
  let minWidth = (select ? SELECT_WIDTH : 0) + (actions ? ACTIONS_WIDTH : 0)
  let pinnedOffset = select ? SELECT_WIDTH : 0
  const pinnedStart: (number | undefined)[] = []
  const tracks = columns.map((column, index) => {
    const width = widths[index]!
    minWidth += width.min
    pinnedStart.push(column.pin ? pinnedOffset : undefined)
    if (column.pin) pinnedOffset += width.min
    // A pinned column another pinned column follows can't grow, so the next offset is known.
    const offsetsNext = column.pin && columns[index + 1]?.pin === true
    return offsetsNext ? `${width.min}rem` : track(width)
  })
  if (select) tracks.unshift(`${SELECT_WIDTH}rem`)
  if (actions) tracks.push(`${ACTIONS_WIDTH}rem`)
  return { template: tracks.join(' '), minWidth, pinnedStart }
}
