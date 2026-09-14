import type { PaneRole } from './variants'

export const PANE_MIN_PARENT = 16
export const PANE_MIN_FILL = 28
export const PANE_INSPECTOR = 14
export const PANE_GAP = 0.75
export const PANE_ROW_PADDING = 1.5
export const PANE_MAX_COLUMNS = 3
export const PANE_MAX_DEPTH = 3
export const PANE_MAX_LEVELS = 2

export type PaneDepth = 0 | 1 | 2 | 3
// Named, not the number: Chrome drops every `data-depth` rule for a value no selector names.
export const PANE_DEEP = 'deep'

export const ROLE_DEPTH: Record<PaneRole, PaneDepth | null> = {
  list: 0,
  detail: 1,
  inspector: null
}

/** Content width, in rem, at which `columns` navigation columns fit. */
export function columnTier(columns: number): number {
  if (columns === 1) return 0
  return (
    (columns - 1) * PANE_MIN_PARENT +
    PANE_MIN_FILL +
    (columns - 1) * PANE_GAP +
    PANE_ROW_PADDING
  )
}

/** How many columns a row shows: never more than it has levels. */
export function visibleColumns(columns: number, levels: number): number {
  return Math.min(columns, levels)
}

const TRACK = {
  2: { share: 40, max: 24 },
  3: { share: 25, max: 20 }
} as const

const trackOf = (columns: number) => TRACK[columns === 2 ? 2 : 3]

const reservedBeside = (columns: number) =>
  PANE_MIN_FILL + (columns - 1) * PANE_GAP + PANE_ROW_PADDING

export function parentTrack(columns: number): string {
  const { share, max } = trackOf(columns)
  const reserved = reservedBeside(columns)
  const room =
    columns === 2
      ? `100cqi - ${reserved}rem`
      : `(100cqi - ${reserved}rem) / ${columns - 1}`
  return `clamp(${PANE_MIN_PARENT}rem, min(${share}cqi, ${room}), ${max}rem)`
}

/** `parentTrack` resolved at a content width, both in rem. */
export function parentTrackWidth(columns: number, content: number): number {
  const { share, max } = trackOf(columns)
  const room = (content - reservedBeside(columns)) / (columns - 1)
  return Math.min(
    Math.max(Math.min((share * content) / 100, room), PANE_MIN_PARENT),
    max
  )
}

const inspectorFits = (levels: number, content: number) => {
  const shown = Math.min(levels, PANE_MAX_COLUMNS)
  // One column stacks its panes absolutely, so nothing sits beside them.
  if (content < columnTier(Math.max(shown, 2))) return false
  const parents =
    shown === 1 ? 0 : (shown - 1) * parentTrackWidth(shown, content)
  const fill =
    content - PANE_ROW_PADDING - parents - PANE_INSPECTOR - shown * PANE_GAP
  return fill >= PANE_MIN_FILL
}

// 1px: the fill only grows with the content within a tier, so the first fit holds from there up.
const PX = 1 / 16

/** Content width, in rem, from which the inspector fits beside every level present and the fill keeps its minimum. */
export function inspectorTier(levels: number): number {
  let content = columnTier(Math.max(Math.min(levels, PANE_MAX_COLUMNS), 2))
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

const besideVerticalPrimary = (level: number) =>
  `[data-slot="navigator"]${ownedBy(level)}:has([data-slot="navigator-primary"][data-orientation="vertical"]${ownedBy(level)}) ${row(level)}`

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
const COLUMN = `translate: none; opacity: 1; visibility: visible; pointer-events: auto; content-visibility: visible; ${LANDED} transition: none;`

function geometry(
  columns: number,
  cell: PaneCell,
  depth: number,
  levels: number
): string {
  const parked = `visibility: hidden; pointer-events: none; content-visibility: auto; ${PARKED} ${columns > 1 ? 'transition: none;' : LEAVING}`
  switch (cell.slot) {
    case 'behind':
      return `translate: -33% 0; opacity: 0.9; ${parked}`
    case 'ahead':
      return `translate: calc(100% + var(--pane-stack-inset, 0px)) 0; opacity: 1; ${parked}`
    case 'top':
      return `translate: 0 0; opacity: 1; visibility: visible; pointer-events: auto; content-visibility: visible; ${LANDED} ${LANDING}`
    case 'fill':
      return `position: relative !important; inset: auto; flex: 1 1 0; order: ${depth}; ${COLUMN}`
    case 'parent':
      return `position: relative !important; inset: auto; flex: 0 0 ${parentTrack(visibleColumns(columns, levels))}; order: ${depth}; ${COLUMN}`
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
  const selector = `${row(level)}${baseIs(level, base)}${topIs(level, top, base)}${levelsIs(level, levels, base)} ${stackPane(level, base + depth)}`
  const vars = `--pane-back: ${display(cell.back)}; --pane-close: ${display(cell.close)}; --pane-edge: ${display(cell.back || cell.close)};`
  return `  ${selector} { ${vars} ${geometry(columns, cell, base + depth, levels)} }`
}

function tierRules(level: number, columns: number): string {
  const rules: string[] = []
  for (const base of BASES) {
    for (const levels of levelCounts(base)) {
      for (let top = 0; top < levels; top += 1) {
        for (let depth = 0; depth < levels; depth += 1) {
          rules.push(paneRule(level, columns, levels, top, depth, base))
        }
      }
    }
  }
  const body = rules.join('\n')
  if (columns === 1) return body
  return [
    `@container panes (width >= ${rem(columnTier(columns))}) {`,
    `  ${row(level)} { padding: ${rem(PANE_GAP)}; gap: ${rem(PANE_GAP)}; }`,
    `  @media (width >= 48rem) { ${besideVerticalPrimary(level)} { padding-inline-start: 0; } }`,
    body,
    '}'
  ].join('\n')
}

function inspectorRules(level: number): string {
  const rules: string[] = []
  for (const base of BASES) {
    for (const levels of levelCounts(base)) {
      rules.push(
        `@container panes (width >= ${rem(inspectorTier(levels))}) { ${row(level)}${baseIs(level, base)}${levelsIs(level, levels, base)} [data-role="inspector"][data-level="${level}"] { display: block; } }`
      )
    }
  }
  return rules.join('\n')
}

function inspectorVariant(): string {
  const branches: string[] = []
  for (const base of BASES) {
    for (const levels of levelCounts(base)) {
      branches.push(
        `  @container panes (width < ${rem(inspectorTier(levels))}) { ${row(0)}${baseIs(0, base)}${levelsIs(0, levels, base)} & { @slot; } }`
      )
    }
  }
  return `@custom-variant pane-inspector-yielded {\n${branches.join('\n')}\n}`
}

function levelRules(level: number): string {
  const stacked = `[data-stack][data-level="${level}"]:is(${tableDepths})`
  const pane = `${row(level)} ${stacked}`
  const inset = `inset: var(--pane-stack-inset, 0px); inset-inline-start: var(--pane-stack-inset-start, var(--pane-stack-inset, 0px));`
  // Past the deepest column: covers the row, over every column, while current.
  const deep = `[data-stack][data-level="${level}"][data-depth="${PANE_DEEP}"]`
  return [
    // Reset per row, or a nested row inherits its outer row's value.
    `  ${row(level)} { --pane-stack-inset-start: var(--pane-stack-inset); }`,
    `  ${besideVerticalPrimary(level)} { --pane-stack-inset-start: 0px; }`,
    `  ${pane} { position: absolute !important; ${inset} }`,
    `  ${row(level)} ${deep} { position: absolute !important; ${inset} z-index: 3; visibility: hidden; pointer-events: none; }`,
    `  ${row(level)}:not([data-reveal]) ${deep}[data-current] { visibility: visible; pointer-events: auto; }`,
    `  @media (prefers-reduced-motion: no-preference) { ${row(level)}[data-pushing] ${stacked} { transition-duration: var(--duration-slow); } }`,
    `  ${row(level)} [data-role="inspector"][data-level="${level}"] { display: none; order: 99; flex: 0 0 ${rem(PANE_INSPECTOR)}; }`,
    `  ${row(level)}:not([data-overflow]) [data-stack][data-level="${level}"][data-overflow] { display: none; }`,
    `  ${row(level)}[data-overflow] ${stackPane(level, 0)}:not([data-overflow]) { display: none; }`
  ].join('\n')
}

const PANE_RULES = `  [data-slot="pane"][data-depth] { --pane-back: none; --pane-close: none; --pane-edge: none; }
  [data-slot="pane"][data-depth]:not([data-depth="0"]) { --pane-back: grid; --pane-edge: grid; }
  [data-slot="pane"][data-depth] [data-slot="pane-back"] { display: var(--pane-back); }
  [data-slot="pane"][data-depth] [data-slot="pane-close"] { display: var(--pane-close); }`

/** The stylesheet `scripts/generate-pane-columns.mjs` writes. */
export function renderPaneColumnsCss(): string {
  const blocks: string[] = [PANE_RULES]
  for (let level = 0; level < PANE_MAX_LEVELS; level += 1) {
    blocks.push(levelRules(level))
    for (let columns = 1; columns <= PANE_MAX_COLUMNS; columns += 1) {
      blocks.push(tierRules(level, columns))
    }
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
