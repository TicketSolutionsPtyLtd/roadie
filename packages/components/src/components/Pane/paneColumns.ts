import type { PaneRole } from './variants'

export const PANE_MIN_FILL = 28
export const PANE_INSPECTOR = 14
export const PANE_GAP = 0.75
export const PANE_ROW_PADDING = 1.5
export const PANE_MAX_COLUMNS = 3
export const PANE_MAX_DEPTH = 3
export const PANE_MAX_LEVELS = 2
// Beside a vertical primary the left-most pane sits flush with Content's edge.
export const PANE_SHADOW_ROOM = 0.5

type Track = { min: number; share: number; max: number }

/**
 * A parent column's track, by the columns shown and whether it is the row's
 * root. The root navigates; a pane drilled into from it holds content. Two
 * columns keep one floor, because below it the parent leaves the screen
 * rather than a column to its left.
 */
export const PARENT_TRACKS = {
  2: {
    root: { min: 16, share: 40, max: 24 },
    detail: { min: 16, share: 40, max: 28 }
  },
  3: {
    root: { min: 16, share: 25, max: 20 },
    detail: { min: 20, share: 30, max: 28 }
  }
} as const satisfies Record<2 | 3, Record<'root' | 'detail', Track>>

export type PaneDepth = 0 | 1 | 2 | 3
// Named, not the number: Chrome drops every `data-depth` rule for a value no selector names.
export const PANE_DEEP = 'deep'

export const ROLE_DEPTH: Record<PaneRole, PaneDepth | null> = {
  list: 0,
  detail: 1,
  inspector: null
}

const trackOf = (columns: number, depth: number) =>
  PARENT_TRACKS[columns === 2 ? 2 : 3][depth === 0 ? 'root' : 'detail']

const rootward = (columns: number) =>
  Array.from({ length: columns - 1 }, (_, depth) => depth)

const minsOf = (columns: number, parents: readonly number[]) =>
  parents.reduce((sum, depth) => sum + trackOf(columns, depth).min, 0)

/** Content width, in rem, at which `columns` columns fit with parents at these depths, by default a row from its root. */
export function columnTier(
  columns: number,
  parents: readonly number[] = rootward(columns)
): number {
  if (columns === 1) return 0
  return (
    minsOf(columns, parents) +
    PANE_MIN_FILL +
    (columns - 1) * PANE_GAP +
    PANE_ROW_PADDING
  )
}

/** How many columns a row shows: never more than it has levels. */
export function visibleColumns(columns: number, levels: number): number {
  return Math.min(columns, levels)
}

const reservedBeside = (columns: number) =>
  PANE_MIN_FILL + (columns - 1) * PANE_GAP + PANE_ROW_PADDING

// Room left beside the fill's minimum is split by the parents' minimums, so they all reach theirs at the tier.
export function parentTrack(
  columns: number,
  depth: number,
  parents: readonly number[] = rootward(columns)
): string {
  const { min, share, max } = trackOf(columns, depth)
  const total = minsOf(columns, parents)
  const room = `100cqi - ${reservedBeside(columns)}rem`
  const split = total === min ? room : `(${room}) * ${min} / ${total}`
  return `clamp(${min}rem, min(${share}cqi, ${split}), ${max}rem)`
}

/** `parentTrack` resolved at a content width, both in rem. */
export function parentTrackWidth(
  columns: number,
  depth: number,
  parents: readonly number[],
  content: number
): number {
  const { min, share, max } = trackOf(columns, depth)
  const room =
    ((content - reservedBeside(columns)) * min) / minsOf(columns, parents)
  return Math.min(Math.max(Math.min((share * content) / 100, room), min), max)
}

/** The depths a row lays out in parent tracks. */
export function parentsOf(
  columns: number,
  top: number,
  levels: number
): number[] {
  return Array.from({ length: levels }, (_, depth) => depth).filter(
    (depth) => paneCell(columns, top, depth, levels).slot === 'parent'
  )
}

/** Content width, in rem, from which a row lays out `columns` columns with this top: never below two columns' tier, which a one-level row fills alone. */
export function rowTier(columns: number, top: number, levels: number): number {
  return Math.max(
    columnTier(2),
    columnTier(visibleColumns(columns, levels), parentsOf(columns, top, levels))
  )
}

const inspectorFits = (levels: number, content: number) => {
  const shown = Math.min(levels, PANE_MAX_COLUMNS)
  return Array.from({ length: levels }, (_, top) => top).every((top) => {
    const parents = parentsOf(shown, top, levels)
    // One column stacks its panes absolutely, so nothing sits beside them.
    if (content < rowTier(shown, top, levels)) return false
    const tracks = parents.reduce(
      (sum, depth) => sum + parentTrackWidth(shown, depth, parents, content),
      0
    )
    const fill =
      content - PANE_ROW_PADDING - tracks - PANE_INSPECTOR - shown * PANE_GAP
    return fill >= PANE_MIN_FILL
  })
}

// 1px: the fill only grows with the content within a tier, so the first fit holds from there up.
const PX = 1 / 16

/** Content width, in rem, from which the inspector fits beside every level present, at any top, and the fill keeps its minimum. */
export function inspectorTier(levels: number): number {
  let content = columnTier(2)
  while (!inspectorFits(levels, content)) content += PX
  return content
}

export type PaneSlot = 'top' | 'parent' | 'fill' | 'behind' | 'ahead'
export type PaneCell = { slot: PaneSlot; back: boolean; close: boolean }

export function paneCell(
  columns: number,
  top: number,
  depth: number,
  levels: number
): PaneCell {
  const rank = (d: number) => (d <= top ? top - d : d)
  const visible: number[] = []
  for (let d = 0; d < levels; d += 1) if (rank(d) < columns) visible.push(d)
  const leftmost = visible[0] ?? 0
  const rightmost = visible[visible.length - 1] ?? 0
  if (rank(depth) >= columns) {
    return {
      slot: depth <= top ? 'behind' : 'ahead',
      back: false,
      close: false
    }
  }
  return {
    slot: columns === 1 ? 'top' : depth === rightmost ? 'fill' : 'parent',
    back: depth === leftmost && depth >= 1 && depth <= top,
    close: depth === top && top >= 1 && leftmost < top
  }
}

const rem = (value: number) => `${value}rem`
const display = (on: boolean) => (on ? 'grid' : 'none')

const row = (level: number) =>
  `[data-slot="navigator-panes"][data-level="${level}"]`
const stackPane = (level: number, depth: number, extra = '') =>
  `[data-stack][data-level="${level}"][data-depth="${depth}"]${extra}`

// Before panes register, a lone `detail` is written at its role default, 1,
// with nothing at 0. Such a row is read one depth shallower, so its first
// pane is still the root. Closed More holds no root.
const BASES = [0, 1] as const
const baseIs = (level: number, base: number) => {
  const root = `:has(${stackPane(level, 0, ':not([data-overflow])')})`
  return base === 0
    ? `:is([data-overflow], ${root})`
    : `:not([data-overflow]):not(${root})`
}

const levelsIs = (level: number, levels: number, base: number) => {
  const deepest = base + levels - 1
  const has = `:has(${stackPane(level, deepest)})`
  return deepest >= PANE_MAX_DEPTH
    ? has
    : `${has}:not(:has(${stackPane(level, deepest + 1)}))`
}

const currentBelow = (level: number, top: number) => {
  const deeper: string[] = []
  for (let d = top + 1; d <= PANE_MAX_DEPTH; d += 1) {
    deeper.push(stackPane(level, d, '[data-current]'))
  }
  return deeper.length === 0 ? '' : `:not(:has(${deeper.join(', ')}))`
}

const topIs = (level: number, top: number, base: number) =>
  top === 0
    ? `:is([data-reveal], ${currentBelow(level, base)})`
    : `:not([data-reveal]):has(${stackPane(level, base + top, '[data-current]')})${currentBelow(level, base + top)}`

const levelCounts = (base: number) =>
  Array.from({ length: PANE_MAX_DEPTH + 1 - base }, (_, index) => index + 1)

const ownedBy = (level: number) =>
  `${level > 0 ? `:is(${row(level - 1)} *)` : ''}:not(${row(level)} *)`

const besideVerticalPrimary = (level: number, target = row(level)) =>
  `[data-slot="navigator"]${ownedBy(level)}:has([data-slot="navigator-primary"][data-orientation="vertical"]${ownedBy(level)}) ${target}`

const contentOf = (level: number) =>
  `[data-slot="navigator-content"]:has(> ${row(level)})`

const tableDepths = Array.from(
  { length: PANE_MAX_DEPTH + 1 },
  (_, depth) => `[data-depth="${depth}"]`
).join(', ')

const LANDED = 'z-index: 2;'
const PARKED = 'z-index: 0;'
// z-index steps: a pane rises over Content's edge cover as it lands and drops under it as it leaves.
const LANDING =
  'transition-property: translate, opacity, z-index; transition-timing-function: var(--ease-enter), var(--ease-enter), step-end;'
const LEAVING =
  'transition-property: translate, opacity, visibility, z-index; transition-timing-function: var(--ease-enter), var(--ease-enter), var(--ease-enter), step-start;'
// `--pane-dir` flips the parked translates under `dir="rtl"`.
const BEHIND = 'translate: calc(-33% * var(--pane-dir, 1)) 0;'
const AHEAD =
  'translate: calc((100% + var(--pane-stack-inset, 0px)) * var(--pane-dir, 1)) 0;'
const COLUMN = `translate: none; opacity: 1; visibility: visible; pointer-events: auto; content-visibility: visible; ${LANDED} transition: none;`

function geometry(
  columns: number,
  cell: PaneCell,
  depth: number,
  levels: number,
  track: string
): string {
  const parked = `visibility: hidden; pointer-events: none; content-visibility: auto; ${PARKED} ${columns > 1 ? 'transition: none;' : LEAVING}`
  switch (cell.slot) {
    case 'behind':
      return `${BEHIND} opacity: 0.9; ${parked}`
    case 'ahead':
      return `${AHEAD} opacity: 1; ${parked}`
    case 'top':
      return `translate: 0 0; opacity: 1; visibility: visible; pointer-events: auto; content-visibility: visible; ${LANDED} ${LANDING}`
    case 'fill':
      return `position: relative !important; inset: auto; flex: 1 1 0; order: ${depth}; ${COLUMN}`
    case 'parent':
      return `position: relative !important; inset: auto; flex: 0 0 ${track}; order: ${depth}; ${COLUMN}`
  }
}

function paneRule(
  level: number,
  columns: number,
  levels: number,
  top: number,
  depth: number,
  base: number
): string {
  const cell = paneCell(columns, top, depth, levels)
  const shown = visibleColumns(columns, levels)
  const track = parentTrack(shown, depth, parentsOf(columns, top, levels))
  const selector = `${row(level)}${baseIs(level, base)}${topIs(level, top, base)}${levelsIs(level, levels, base)} ${stackPane(level, base + depth)}`
  const vars = `--pane-back: ${display(cell.back)}; --pane-close: ${display(cell.close)}; --pane-edge: ${display(cell.back || cell.close)};`
  return `  ${selector} { ${vars} ${geometry(columns, cell, base + depth, levels, track)} }`
}

function stackRules(level: number): string {
  const rules: string[] = []
  for (const base of BASES) {
    for (const levels of levelCounts(base)) {
      for (let top = 0; top < levels; top += 1) {
        for (let depth = 0; depth < levels; depth += 1) {
          rules.push(paneRule(level, 1, levels, top, depth, base))
        }
      }
    }
  }
  return rules.join('\n')
}

// Grouped by the width each row needs, ascending, so a wider tier's rule comes
// later and wins. A row with fewer levels than columns is already laid out by
// the tier its levels fill.
function columnRules(level: number): string {
  const tiers = new Map<number, string[]>()
  for (let columns = 2; columns <= PANE_MAX_COLUMNS; columns += 1) {
    for (const base of BASES) {
      for (const levels of levelCounts(base)) {
        if (columns > 2 && levels < columns) continue
        for (let top = 0; top < levels; top += 1) {
          const tier = rowTier(columns, top, levels)
          const rules = tiers.get(tier) ?? []
          for (let depth = 0; depth < levels; depth += 1) {
            rules.push(paneRule(level, columns, levels, top, depth, base))
          }
          tiers.set(tier, rules)
        }
      }
    }
  }
  return [...tiers.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tier, rules]) =>
      [
        `@container panes (width >= ${rem(tier)}) {`,
        ...(tier === columnTier(2)
          ? [
              `  ${row(level)} { padding: ${rem(PANE_GAP)}; gap: ${rem(PANE_GAP)}; }`,
              `  @media (width >= 48rem) { ${besideVerticalPrimary(level)} { padding-inline-start: 0; } }`
            ]
          : []),
        ...rules,
        '}'
      ].join('\n')
    )
    .join('\n')
}

// Hides, never shows: `!important` so a consumer's display utility can't keep
// a yielded inspector on screen, while a shown one keeps the consumer's display.
const HIDDEN = 'display: none !important;'

function inspectorRules(level: number): string {
  const inspector = `[data-role="inspector"][data-level="${level}"]`
  const rules = [
    `  ${row(level)}:not([data-overflow]):not(:has([data-stack][data-level="${level}"]:not([data-overflow]))) ${inspector} { ${HIDDEN} }`
  ]
  for (const base of BASES) {
    for (const levels of levelCounts(base)) {
      rules.push(
        `@container panes (width < ${rem(inspectorTier(levels))}) { ${row(level)}${baseIs(level, base)}${levelsIs(level, levels, base)} ${inspector} { ${HIDDEN} } }`
      )
    }
  }
  return rules.join('\n')
}

// `@container panes` finds the nearest Content, so each level reads its own row.
function inspectorVariant(): string {
  const branches: string[] = []
  for (let level = 0; level < PANE_MAX_LEVELS; level += 1) {
    const own = level + 1 < PANE_MAX_LEVELS ? `:not(${row(level + 1)} *)` : ''
    for (const base of BASES) {
      for (const levels of levelCounts(base)) {
        branches.push(
          `  @container panes (width < ${rem(inspectorTier(levels))}) { ${row(level)}${baseIs(level, base)}${levelsIs(level, levels, base)} &${own} { @slot; } }`
        )
      }
    }
  }
  return `@custom-variant pane-inspector-yielded {\n${branches.join('\n')}\n}`
}

const PAGE_GHOST = '[data-slot="navigator-page-ghost"]'
const PAGE_STEP = 'var(--duration-slow) var(--ease-enter)'
// Opaque, as the section list parks behind the ghost. The returning pane holds
// z-index 0, under the ghost and Content's edge cover, as a landing pane does.
const PAGE_STEP_KEYFRAMES = `  @keyframes navigator-page-enter { from { ${AHEAD} } }
  @keyframes navigator-page-behind { to { ${BEHIND} } }
  @keyframes navigator-page-return { from { ${BEHIND} opacity: 0.9; z-index: 0; } to { z-index: 0; } }
  @keyframes navigator-page-leave { to { ${AHEAD} } }`

// Stacked rows only: columns cut.
function pageStepRules(level: number): string {
  const step = (kind: 'push' | 'pop') =>
    `${row(level)}[data-page-step="${kind}"]`
  const top = `[data-stack][data-level="${level}"][data-stack-position="top"]`
  return [
    `  @container panes (width < ${rem(columnTier(2))}) { @media (prefers-reduced-motion: no-preference) {`,
    `    ${step('push')} ${top} { animation: navigator-page-enter ${PAGE_STEP}; }`,
    `    ${step('push')} > ${PAGE_GHOST} { animation: navigator-page-behind ${PAGE_STEP} forwards; }`,
    `    ${step('pop')} ${top} { animation: navigator-page-return ${PAGE_STEP}; }`,
    `    ${step('pop')} > ${PAGE_GHOST} { z-index: 3; animation: navigator-page-leave ${PAGE_STEP} forwards; }`,
    '  } }'
  ].join('\n')
}

// Content reaches into the primary's gutter, padded back, so its clip leaves a
// flush pane's shadow room without `overflow-clip-margin`, which WebKit lacks.
// The cover over that room sits under a landed pane and over a sliding one.
function shadowRoomRules(level: number): string {
  const content = besideVerticalPrimary(level, contentOf(level))
  const room = rem(PANE_SHADOW_ROOM)
  return [
    `  @media (width >= 48rem) {`,
    `    ${content} { margin-inline-start: -${room}; padding-inline-start: ${room}; }`,
    `    ${content}::before { content: ''; position: absolute; inset-block: 0; inset-inline-start: 0; inline-size: ${room}; z-index: 1; background-color: var(--intent-bg-sunken); pointer-events: none; }`,
    '  }'
  ].join('\n')
}

function levelRules(level: number): string {
  const stacked = `[data-stack][data-level="${level}"]:is(${tableDepths})`
  const pane = `${row(level)} ${stacked}`
  const inset = `inset: var(--pane-stack-inset, 0px); inset-inline-start: var(--pane-stack-inset-start, var(--pane-stack-inset, 0px));`
  // Past the deepest column: slides in over every column while current.
  const deep = `[data-stack][data-level="${level}"][data-depth="${PANE_DEEP}"]`
  return [
    // Reset per row, or a nested row inherits its outer row's value.
    `  ${row(level)} { --pane-stack-inset-start: var(--pane-stack-inset); }`,
    // Attributes, not `:dir()`: Lightning CSS lowers `:dir()` to a `:lang()` list.
    `  [dir="rtl"] ${row(level)} { --pane-dir: -1; }`,
    `  [dir="rtl"] [dir="ltr"] ${row(level)} { --pane-dir: 1; }`,
    `  ${besideVerticalPrimary(level)} { --pane-stack-inset-start: 0px; }`,
    shadowRoomRules(level),
    `  ${pane} { position: absolute !important; ${inset} }`,
    `  ${row(level)} ${deep} { position: absolute !important; ${inset} z-index: 3; ${AHEAD} visibility: hidden; pointer-events: none; transition-property: translate, visibility; transition-timing-function: var(--ease-enter); }`,
    `  ${row(level)}:not([data-reveal]) ${deep}[data-current] { translate: 0 0; visibility: visible; pointer-events: auto; }`,
    `  @media (prefers-reduced-motion: no-preference) { ${row(level)}[data-pushing] :is(${stacked}, ${deep}) { transition-duration: var(--duration-slow); } }`,
    `  ${row(level)} > ${PAGE_GHOST} { position: absolute; ${inset} z-index: 0; }`,
    pageStepRules(level),
    `  ${row(level)} [data-role="inspector"][data-level="${level}"] { order: 99; flex: 0 0 ${rem(PANE_INSPECTOR)}; }`,
    `  ${row(level)}:not([data-overflow]) [data-stack][data-level="${level}"][data-overflow] { ${HIDDEN} }`,
    `  ${row(level)}[data-overflow] ${stackPane(level, 0)}:not([data-overflow]) { ${HIDDEN} }`
  ].join('\n')
}

const PANE_RULES = `  [data-slot="pane"][data-depth] { --pane-back: none; --pane-close: none; --pane-edge: none; }
  [data-slot="pane"][data-depth]:not([data-depth="0"]) { --pane-back: grid; --pane-edge: grid; }
  [data-slot="pane"][data-depth] [data-slot="pane-back"] { display: var(--pane-back); }
  [data-slot="pane"][data-depth] [data-slot="pane-close"] { display: var(--pane-close); }`

/** The stylesheet `scripts/generate-pane-columns.mjs` writes. */
export function renderPaneColumnsCss(): string {
  const blocks: string[] = [PANE_RULES, PAGE_STEP_KEYFRAMES]
  for (let level = 0; level < PANE_MAX_LEVELS; level += 1) {
    blocks.push(levelRules(level))
    blocks.push(stackRules(level), columnRules(level))
    blocks.push(inspectorRules(level))
  }
  return [
    '/* Generated by scripts/generate-pane-columns.mjs from paneColumns.ts. Do not edit. */',
    inspectorVariant(),
    '@layer components {',
    blocks.join('\n'),
    '}',
    ''
  ].join('\n')
}
