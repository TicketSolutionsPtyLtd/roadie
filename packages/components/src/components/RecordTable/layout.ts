import { type RecordField, formatRecordValue } from '@oztix/roadie-core/records'

import { isDev } from '../../utils/isDev'
import { NOT_AVAILABLE } from '../Records/RecordValue'
import type {
  RecordColumnWidth,
  RecordTableColumn,
  RecordTableNarrow
} from './types'

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
  /** Each column's place under 40rem, when the rows re-flow there rather than swap for a list. */
  narrow?: NarrowRole[]
  /** A description gives narrow rows a second line. */
  twoLines: boolean
  /** The narrow row's grid, as custom properties. */
  narrowGrid?: Record<string, string>
}

type NarrowRole = Exclude<RecordTableNarrow, 'detail'>

/** Where each priority tier starts, in rem of the table's width. */
export const PRIORITY_HIDES_BELOW = { 3: 64, 2: 56, 1: 48 } as const
const TIERS = [1, 2, 3] as const

// Written out because Tailwind reads classes from source; layout.test.ts checks them against PRIORITY_HIDES_BELOW.
export const TIER_CLASSES = {
  3: {
    hide: '@max-[64rem]/record-table-frame:hidden',
    hideAboveNarrow:
      '@min-[40rem]/record-table-frame:@max-[64rem]/record-table-frame:hidden',
    start: '@max-[64rem]/record-table-frame:ps-(--content-inset)',
    end: '@max-[64rem]/record-table-frame:pe-(--content-inset)',
    template:
      '@max-[64rem]/record-table-frame:[--record-table-columns:var(--record-table-columns-3)] @max-[64rem]/record-table-frame:[--record-table-min-width:var(--record-table-min-width-3)]'
  },
  2: {
    hide: '@max-[56rem]/record-table-frame:hidden',
    hideAboveNarrow:
      '@min-[40rem]/record-table-frame:@max-[56rem]/record-table-frame:hidden',
    start: '@max-[56rem]/record-table-frame:ps-(--content-inset)',
    end: '@max-[56rem]/record-table-frame:pe-(--content-inset)',
    template:
      '@max-[56rem]/record-table-frame:[--record-table-columns:var(--record-table-columns-2)] @max-[56rem]/record-table-frame:[--record-table-min-width:var(--record-table-min-width-2)]'
  },
  1: {
    hide: '@max-[48rem]/record-table-frame:hidden',
    hideAboveNarrow:
      '@min-[40rem]/record-table-frame:@max-[48rem]/record-table-frame:hidden',
    start: '@max-[48rem]/record-table-frame:ps-(--content-inset)',
    end: '@max-[48rem]/record-table-frame:pe-(--content-inset)',
    template:
      '@max-[48rem]/record-table-frame:[--record-table-columns:var(--record-table-columns-1)] @max-[48rem]/record-table-frame:[--record-table-min-width:var(--record-table-min-width-1)]'
  }
} as const

// Under 40rem the row is a grid of named areas, and each cell takes its role's.
// The areas and tracks come from tierStyle, as the roles shown vary by table.
// In Select mode the checkbox takes the leading area, or adds one; a hidden checkbox's area would leave a gap.
const NARROW_ROW_CLASS =
  '@max-[40rem]/record-table-frame:grid-cols-(--record-table-narrow-columns) @max-[40rem]/record-table-frame:[grid-template-areas:var(--record-table-narrow-areas)] @max-[40rem]/record-table-frame:in-data-selecting:grid-cols-(--record-table-narrow-columns-selecting) @max-[40rem]/record-table-frame:in-data-selecting:[grid-template-areas:var(--record-table-narrow-areas-selecting)] @max-[40rem]/record-table-frame:gap-x-3 @max-[40rem]/record-table-frame:px-(--content-inset)'
const TWO_LINES = '@max-[40rem]/record-table-frame:grid-rows-2'
/** The row actions cell's place under 40rem, when the rows re-flow. */
export const NARROW_ACTIONS_CLASS =
  '@max-[40rem]/record-table-frame:[grid-area:actions]'
// A pinned cell's sticky start would push it past its area, as nothing scrolls sideways.
const NARROW_CELL =
  '@max-[40rem]/record-table-frame:px-0 @max-[40rem]/record-table-frame:first:ps-0 @max-[40rem]/record-table-frame:last:pe-0 @max-[40rem]/record-table-frame:start-0'
// Full literals: Tailwind reads classes from source.
const NARROW_CLASSES: Record<NarrowRole, string> = {
  title: `${NARROW_CELL} @max-[40rem]/record-table-frame:[grid-area:title] @max-[40rem]/record-table-frame:justify-start`,
  description: `${NARROW_CELL} @max-[40rem]/record-table-frame:[grid-area:description] @max-[40rem]/record-table-frame:items-start @max-[40rem]/record-table-frame:justify-start @max-[40rem]/record-table-frame:font-normal @max-[40rem]/record-table-frame:text-subtle`,
  // Select mode's checkbox takes the leading place.
  leading: `${NARROW_CELL} @max-[40rem]/record-table-frame:[grid-area:leading] @max-[40rem]/record-table-frame:in-data-selecting:hidden`,
  trailing: `${NARROW_CELL} @max-[40rem]/record-table-frame:[grid-area:trailing] @max-[40rem]/record-table-frame:justify-end`,
  hidden: '@max-[40rem]/record-table-frame:hidden'
}
const TITLE_ABOVE = '@max-[40rem]/record-table-frame:items-end'
/** The checkbox cell under 40rem, when the rows re-flow: hidden until Select mode, then in the leading place. */
export const NARROW_SELECT_CLASS = `${NARROW_CELL} @max-[40rem]/record-table-frame:hidden @max-[40rem]/record-table-frame:in-data-selecting:flex @max-[40rem]/record-table-frame:[grid-area:select]`

/** The cell's place in a narrow row, or nothing when the table swaps for a list. */
export const narrowClass = (layout: ColumnLayout, index: number) => {
  const role = layout.narrow?.[index]
  if (!role) return ''
  return role === 'title' && layout.twoLines
    ? `${NARROW_CLASSES.title} ${TITLE_ABOVE}`
    : NARROW_CLASSES[role]
}

/** A body row's grid under 40rem, when the rows re-flow there. */
export const narrowRowClass = (layout: ColumnLayout) =>
  layout.narrow ? `${NARROW_ROW_CLASS} ${layout.twoLines ? TWO_LINES : ''}` : ''

/** A narrow row's areas, leaving out a role no column takes so it adds no gap. */
function narrowAreas(
  roles: readonly NarrowRole[],
  actions: boolean,
  selecting: boolean
) {
  const line = [
    selecting ? 'select' : roles.includes('leading') && 'leading',
    'title',
    roles.includes('trailing') && 'trailing',
    actions && 'actions'
  ].filter((area) => area !== false)
  const lines = roles.includes('description')
    ? [line, line.map((area) => (area === 'title' ? 'description' : area))]
    : [line]
  return {
    areas: lines.map((areas) => `"${areas.join(' ')}"`).join(' '),
    columns: line
      .map((area) => (area === 'title' ? 'minmax(0, 1fr)' : 'auto'))
      .join(' ')
  }
}

function narrowGrid(
  roles: readonly NarrowRole[],
  actions: boolean,
  select: boolean
) {
  const { areas, columns } = narrowAreas(roles, actions, false)
  const selecting = select && narrowAreas(roles, actions, true)
  return {
    '--record-table-narrow-areas': areas,
    '--record-table-narrow-columns': columns,
    ...(selecting && {
      '--record-table-narrow-areas-selecting': selecting.areas,
      '--record-table-narrow-columns-selecting': selecting.columns
    })
  }
}

/** The table's row height under 40rem, which a window reads from `--record-table-row-height`. */
export const narrowContentClass = (layout: ColumnLayout) =>
  layout.twoLines
    ? '@max-[40rem]/record-table-frame:[--record-table-row-height:4rem]'
    : ''

/** Hides the header row from sight, not from screen readers, under 40rem. */
export const NARROW_HEAD_CLASS = '@max-[40rem]/record-table-frame:sr-only'
/** A sort button hides under 40rem, so no hidden header takes focus. */
export const NARROW_SORT_CLASS = '@max-[40rem]/record-table-frame:invisible'

/** Each column's narrow role: the title, then the first column of each other role; the rest hide. */
function narrowRoles(columns: readonly RecordTableColumn[]): NarrowRole[] {
  const title = titleColumn(columns)
  const taken = new Set<RecordTableNarrow>()
  return columns.map((column) => {
    if (column === title) return 'title'
    const role = column.narrow
    if (!role || role === 'title' || role === 'detail' || taken.has(role))
      return 'hidden'
    taken.add(role)
    return role
  })
}

/** The frame is the container the tiers measure; only a table that reaches a pane's edges takes its inset (records-pane.css). */
export const frameClass = '@container/record-table-frame [--content-inset:0px]'

/** Picks the tier's template, so the header and rows agree. */
export const contentTierClass = [
  '[--record-table-columns:var(--record-table-columns-0)] [--record-table-min-width:var(--record-table-min-width-0)] [--record-table-row-height:3rem] @max-[40rem]/record-table-frame:[--record-table-min-width:0px]',
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
    actions = false,
    reflow = false
  }: { select?: boolean; actions?: boolean; reflow?: boolean } = {}
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
  const narrow = reflow ? narrowRoles(columns) : undefined
  const twoLines = narrow?.includes('description') ?? false
  return {
    ...tiers[0]!,
    tiers,
    pinnedStart,
    priority,
    firstAt,
    lastAt,
    narrow,
    twoLines,
    narrowGrid: narrow && narrowGrid(narrow, actions, select)
  }
}

/** A cell's priority, which focus reads when its column hides. */
export const priorityProps = (layout: ColumnLayout, index: number) => ({
  'data-priority': layout.priority[index],
  'data-narrow': layout.narrow?.[index]
})

/** Hides a cell with its priority, and gives the inset to the first and last cells shown at each tier, which a hidden column's `first:` and `last:` would miss. */
export const priorityClass = (layout: ColumnLayout, index: number) => {
  const priority = layout.priority[index]
  // A column with a narrow place shows again under 40rem.
  const placed = (layout.narrow?.[index] ?? 'hidden') !== 'hidden'
  return [
    priority && TIER_CLASSES[priority][placed ? 'hideAboveNarrow' : 'hide'],
    ...(layout.firstAt[index] ?? []).map((tier) => TIER_CLASSES[tier].start),
    ...(layout.lastAt[index] ?? []).map((tier) => TIER_CLASSES[tier].end),
    narrowClass(layout, index)
  ]
    .filter(Boolean)
    .join(' ')
}

/** Each tier's template and minimum width, never `--record-table-columns` itself: an inline value would beat the container queries. */
export const tierStyle = (layout: ColumnLayout) => ({
  ...Object.fromEntries(
    layout.tiers.flatMap(({ template, minWidth }, tier) => [
      [`--record-table-columns-${tier}`, template],
      [
        `--record-table-min-width-${tier}`,
        `calc(${minWidth}rem + 2 * var(--content-inset))`
      ]
    ])
  ),
  ...layout.narrowGrid
})
