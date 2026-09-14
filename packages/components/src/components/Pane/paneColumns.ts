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

/** Content width, in rem, at which the inspector fits beside every level present. */
export function inspectorTier(levels: number): number {
  const stack =
    levels === 1
      ? PANE_MIN_FILL + PANE_ROW_PADDING
      : columnTier(Math.min(levels, PANE_MAX_COLUMNS))
  return stack + PANE_INSPECTOR + PANE_GAP
}

export function parentTrack(columns: number): string {
  if (columns === 2) {
    const reserved = PANE_MIN_FILL + PANE_GAP + PANE_ROW_PADDING
    return `clamp(${PANE_MIN_PARENT}rem, min(40cqi, 100cqi - ${reserved}rem), 24rem)`
  }
  const reserved = PANE_MIN_FILL + (columns - 1) * PANE_GAP + PANE_ROW_PADDING
  return `clamp(${PANE_MIN_PARENT}rem, min(25cqi, (100cqi - ${reserved}rem) / ${columns - 1}), 20rem)`
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

const levelsIs = (level: number, levels: number) => {
  const has = `:has(${stackPane(level, levels - 1)})`
  return levels > PANE_MAX_DEPTH
    ? has
    : `${has}:not(:has(${stackPane(level, levels)}))`
}

const topIs = (level: number, top: number) => {
  if (top === 0) {
    return `:is([data-reveal], :not(:has([data-stack][data-level="${level}"][data-current])))`
  }
  const deeper: string[] = []
  for (let d = top + 1; d <= PANE_MAX_DEPTH; d += 1) {
    deeper.push(stackPane(level, d, '[data-current]'))
  }
  const not = deeper.length === 0 ? '' : `:not(:has(${deeper.join(', ')}))`
  return `:not([data-reveal]):has(${stackPane(level, top, '[data-current]')})${not}`
}

const LANDED = 'z-index: 2;'
const PARKED = 'z-index: 0;'
// z-index steps: a pane rises over Content's edge cover as it lands and drops under it as it leaves.
const LANDING =
  'transition-property: translate, opacity, z-index; transition-timing-function: var(--ease-enter), var(--ease-enter), step-end;'
const LEAVING =
  'transition-property: translate, opacity, visibility, z-index; transition-timing-function: var(--ease-enter), var(--ease-enter), var(--ease-enter), step-start;'
const COLUMN = `translate: none; opacity: 1; visibility: visible; pointer-events: auto; content-visibility: visible; ${LANDED} transition: none;`

function geometry(columns: number, cell: PaneCell, depth: number): string {
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
      return `position: relative !important; inset: auto; flex: 0 0 ${parentTrack(columns)}; order: ${depth}; ${COLUMN}`
  }
}

function paneRule(
  level: number,
  columns: number,
  levels: number,
  top: number,
  depth: number
): string {
  const cell = paneCell(columns, top, depth, levels)
  const selector = `${row(level)}${topIs(level, top)}${levelsIs(level, levels)} ${stackPane(level, depth)}`
  const vars = `--pane-back: ${display(cell.back)}; --pane-close: ${display(cell.close)}; --pane-edge: ${display(cell.back || cell.close)};`
  return `  ${selector} { ${vars} ${geometry(columns, cell, depth)} }`
}

function tierRules(level: number, columns: number): string {
  const rules: string[] = []
  for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
    for (let top = 0; top < levels; top += 1) {
      for (let depth = 0; depth < levels; depth += 1) {
        rules.push(paneRule(level, columns, levels, top, depth))
      }
    }
  }
  const body = rules.join('\n')
  if (columns === 1) return body
  return [
    `@container panes (width >= ${rem(columnTier(columns))}) {`,
    `  ${row(level)} { padding: ${rem(PANE_GAP)}; gap: ${rem(PANE_GAP)}; }`,
    `  @media (width >= 48rem) { [data-slot="navigator"]:has([data-slot="navigator-primary"][data-orientation="vertical"]) ${row(level)} { padding-inline-start: 0; } }`,
    body,
    '}'
  ].join('\n')
}

function inspectorRules(level: number): string {
  const rules: string[] = []
  for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
    rules.push(
      `@container panes (width >= ${rem(inspectorTier(levels))}) { ${row(level)}${levelsIs(level, levels)} [data-role="inspector"][data-level="${level}"] { display: block; } }`
    )
  }
  return rules.join('\n')
}

function inspectorVariant(): string {
  const branches: string[] = []
  for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
    branches.push(
      `  @container panes (width < ${rem(inspectorTier(levels))}) { ${row(0)}${levelsIs(0, levels)} & { @slot; } }`
    )
  }
  return `@custom-variant pane-inspector-yielded {\n${branches.join('\n')}\n}`
}

function levelRules(level: number): string {
  const pane = `${row(level)} [data-stack][data-level="${level}"][data-depth]`
  return [
    `  ${pane} { position: absolute !important; inset: var(--pane-stack-inset, 0px); inset-inline-start: var(--pane-stack-inset-start, var(--pane-stack-inset, 0px)); }`,
    `  @media (prefers-reduced-motion: no-preference) { ${pane} { transition-duration: var(--duration-slow); } }`,
    `  ${row(level)} [data-role="inspector"][data-level="${level}"] { display: none; order: 99; flex: 0 0 ${rem(PANE_INSPECTOR)}; }`,
    `  ${row(level)}:not([data-overflow]) [data-stack][data-level="${level}"][data-overflow] { display: none; }`,
    `  ${row(level)}[data-overflow] ${stackPane(level, 0)}:not([data-overflow]) { display: none; }`
  ].join('\n')
}

const PANE_RULES = `  [data-slot="pane"][data-depth] { --pane-back: none; --pane-close: none; --pane-edge: none; }
  [data-slot="pane"][data-depth]:not([data-stack]):not([data-depth="0"]) { --pane-back: grid; --pane-edge: grid; }
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
