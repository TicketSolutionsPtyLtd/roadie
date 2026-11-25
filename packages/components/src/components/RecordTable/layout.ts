import { type RecordField, formatRecordValue } from '@oztix/roadie-core/records'

import { isDev } from '../../utils/isDev'
import { NOT_AVAILABLE } from '../Records/RecordValue'
import type { RecordColumnWidth, RecordTableColumn } from './types'

/** The column whose value names the row: the narrow title, else the first pinned text column, else the first text one. Never an image. */
export function titleColumn<Column extends RecordTableColumn<never>>(
  columns: readonly Column[]
) {
  const named = columns.filter((column) => column.kind !== 'image')
  return (
    named.find((column) => column.narrow === 'title') ??
    named.find((column) => column.pin && column.field.type === 'text') ??
    named.find((column) => column.field.type === 'text')
  )
}

type ColumnTier = {
  template: string
  /** In rem. */
  minWidth: number
}

export type ColumnLayout = ColumnTier & {
  /** Tier 0 shows every column; tier n hides priority n and above. */
  tiers: ColumnTier[]
  /** Each pinned column's sticky offset, in rem, after any select track. */
  pinnedStart: (number | undefined)[]
  /** Each column's priority in effect: none for a pinned column or the title, which carries the row link. */
  priority: (1 | 2 | 3 | undefined)[]
  /** The tiers at which each column is the first cell shown, so it takes the start inset. */
  firstAt: ((typeof TIERS)[number][] | undefined)[]
  /** The tiers at which each column is the last cell shown, so it takes the end inset. */
  lastAt: ((typeof TIERS)[number][] | undefined)[]
}

/** Where each priority tier starts, in rem of the table's width. */
export const PRIORITY_HIDES_BELOW = { 3: 64, 2: 56, 1: 48 } as const
const TIERS = [1, 2, 3] as const

// Written out because Tailwind reads classes from source; layout.test.ts checks them against PRIORITY_HIDES_BELOW.
export const TIER_CLASSES = {
  3: {
    hide: '@max-[64rem]/record-table-frame:hidden',
    start: '@max-[64rem]/record-table-frame:ps-(--content-inset)',
    end: '@max-[64rem]/record-table-frame:pe-(--content-inset)',
    template:
      '@max-[64rem]/record-table-frame:[--record-table-columns:var(--record-table-columns-3)] @max-[64rem]/record-table-frame:[--record-table-min-width:var(--record-table-min-width-3)]'
  },
  2: {
    hide: '@max-[56rem]/record-table-frame:hidden',
    start: '@max-[56rem]/record-table-frame:ps-(--content-inset)',
    end: '@max-[56rem]/record-table-frame:pe-(--content-inset)',
    template:
      '@max-[56rem]/record-table-frame:[--record-table-columns:var(--record-table-columns-2)] @max-[56rem]/record-table-frame:[--record-table-min-width:var(--record-table-min-width-2)]'
  },
  1: {
    hide: '@max-[48rem]/record-table-frame:hidden',
    start: '@max-[48rem]/record-table-frame:ps-(--content-inset)',
    end: '@max-[48rem]/record-table-frame:pe-(--content-inset)',
    template:
      '@max-[48rem]/record-table-frame:[--record-table-columns:var(--record-table-columns-1)] @max-[48rem]/record-table-frame:[--record-table-min-width:var(--record-table-min-width-1)]'
  }
} as const

/** The frame is the container the tiers measure; only a table that reaches a pane's edges takes its inset (records-pane.css). */
export const frameClass = '@container/record-table-frame [--content-inset:0px]'

/** Picks the tier's template, so the header and rows agree. */
export const contentTierClass = [
  '[--record-table-columns:var(--record-table-columns-0)] [--record-table-min-width:var(--record-table-min-width-0)] [--record-table-row-height:3rem]',
  TIER_CLASSES[3].template,
  TIER_CLASSES[2].template,
  TIER_CLASSES[1].template
].join(' ')

let warnedPinnedPriority = false

/** Warns once that a pinned column's priority is ignored. */
export function warnPinnedPriority(key: string) {
  if (warnedPinnedPriority || !isDev()) return
  warnedPinnedPriority = true
  console.warn(
    `[Roadie] RecordTable column "${key}" is pinned, so its priority is ignored. Pinned columns never hide.`
  )
}

const shownAt = (priority: number | undefined, tier: number) =>
  tier === 0 || priority === undefined || priority < tier

const SAMPLE_ROWS = 200
const REM_PER_CHARACTER = 0.55
const ALWAYS_WHOLE = 16
const CELL_PADDING = 1.25
// Room for the sort caret beside a header.
const HEADER_EXTRA = 3
// A badge's padding, in characters.
const BADGE_EXTRA = 2

const cellLength = (
  field: RecordField,
  row: object,
  timeZone: string,
  custom: boolean
) => {
  const text = formatRecordValue(row, field, { timeZone })
  // A custom cell shows its own empty state, not "Not available".
  if (text === null) return custom ? 0 : NOT_AVAILABLE.length
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
  return columns.map(({ field, width, cell }) => {
    if (width) return width
    const header = field.label.length + HEADER_EXTRA
    const characters = Math.max(
      header,
      typicalLength(
        sample.map((row) => cellLength(field, row, timeZone, !!cell))
      )
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

// The first and last cells carry the frame's inset, so their tracks widen by it.
function track({ min, grow }: RecordColumnWidth, insets: number) {
  const least = insets
    ? `calc(${min}rem + ${insets} * var(--content-inset))`
    : `${min}rem`
  return grow ? `minmax(${least}, ${grow}fr)` : least
}

/** The checkbox track, pinned first. In rem. */
export const SELECT_WIDTH = 2.5
/** The row actions track, pinned last. In rem. */
export const ACTIONS_WIDTH = 3

function columnTier(
  columns: readonly RecordTableColumn[],
  widths: readonly RecordColumnWidth[],
  { select, actions }: { select: boolean; actions: boolean }
): ColumnTier {
  let minWidth = (select ? SELECT_WIDTH : 0) + (actions ? ACTIONS_WIDTH : 0)
  const shown: RecordColumnWidth[] = columns.map((column, index) => {
    const width = widths[index]!
    minWidth += width.min
    // A pinned column another pinned column follows can't grow, so the next offset is known.
    const offsetsNext = column.pin && columns[index + 1]?.pin === true
    return offsetsNext ? { min: width.min } : width
  })
  if (select) shown.unshift({ min: SELECT_WIDTH })
  if (actions) shown.push({ min: ACTIONS_WIDTH })
  const last = shown.length - 1
  const tracks = shown.map((width, index) =>
    track(width, Number(index === 0) + Number(index === last))
  )
  return { template: tracks.join(' '), minWidth }
}

export function columnLayout(
  columns: readonly RecordTableColumn[],
  widths: readonly RecordColumnWidth[],
  {
    select = false,
    actions = false
  }: { select?: boolean; actions?: boolean } = {}
): ColumnLayout {
  let pinnedOffset = select ? SELECT_WIDTH : 0
  const pinnedStart = columns.map((column, index) => {
    if (!column.pin) return undefined
    const start = pinnedOffset
    pinnedOffset += widths[index]!.min
    return start
  })
  const title = titleColumn(columns)
  const priority = columns.map((column) => {
    if (column.pin && column.priority !== undefined)
      warnPinnedPriority(column.key)
    return column.pin || column === title ? undefined : column.priority
  })
  const tiers = [0, ...TIERS].map((tier) => {
    const shown = columns.flatMap((column, index) =>
      shownAt(priority[index], tier) ? [index] : []
    )
    return columnTier(
      shown.map((index) => columns[index]!),
      shown.map((index) => widths[index]!),
      { select, actions }
    )
  })
  const firstAt: ColumnLayout['firstAt'] = columns.map(() => undefined)
  // The select cell starts every row, so no column needs to.
  if (!select)
    for (const tier of TIERS) {
      const first = priority.findIndex((level) => shownAt(level, tier))
      if (first <= 0) continue
      firstAt[first] = [...(firstAt[first] ?? []), tier]
    }
  const lastAt: ColumnLayout['lastAt'] = columns.map(() => undefined)
  // The actions cell ends every row, so no column needs to.
  if (!actions)
    for (const tier of TIERS) {
      const last = priority.findLastIndex((level) => shownAt(level, tier))
      if (last === -1 || last === columns.length - 1) continue
      lastAt[last] = [...(lastAt[last] ?? []), tier]
    }
  return { ...tiers[0]!, tiers, pinnedStart, priority, firstAt, lastAt }
}

/** A cell's priority, which focus reads when its column hides. */
export const priorityProps = (layout: ColumnLayout, index: number) => ({
  'data-priority': layout.priority[index]
})

/** Hides a cell with its priority, and gives the inset to the first and last cells shown at each tier, which a hidden column's `first:` and `last:` would miss. */
export const priorityClass = (layout: ColumnLayout, index: number) => {
  const priority = layout.priority[index]
  return [
    priority && TIER_CLASSES[priority].hide,
    ...(layout.firstAt[index] ?? []).map((tier) => TIER_CLASSES[tier].start),
    ...(layout.lastAt[index] ?? []).map((tier) => TIER_CLASSES[tier].end)
  ]
    .filter(Boolean)
    .join(' ')
}

/** Each tier's template and minimum width, never `--record-table-columns` itself: an inline value would beat the container queries. */
export const tierStyle = (layout: ColumnLayout) =>
  Object.fromEntries(
    layout.tiers.flatMap(({ template, minWidth }, tier) => [
      [`--record-table-columns-${tier}`, template],
      [
        `--record-table-min-width-${tier}`,
        `calc(${minWidth}rem + 2 * var(--content-inset))`
      ]
    ])
  )
