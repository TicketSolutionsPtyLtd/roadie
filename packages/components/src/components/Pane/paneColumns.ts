import { PANE_MAX_DEPTH } from './paneDepth'
import type { PaneInspectorSize } from './variants'

export { PANE_MAX_DEPTH }

const PANE_MIN_FILL = 28
/** Inspector widths by `size`; `pane-columns.css` hard-codes each with its `inspectorTier`s. */
export const PANE_INSPECTOR = {
  sm: 14,
  md: 20,
  lg: 24
} as const satisfies Record<PaneInspectorSize, number>
export const PANE_GAP = 0.75
const PANE_ROW_PADDING = 1.5
export const PANE_MAX_COLUMNS = 3

type Track = { min: number; share: number; max: number }

// Content needs the same room beside one column as beside two.
const DETAIL = { min: 25, max: 30 } as const

/** Parent track widths by columns shown and whether it is the root. */
const PARENT_TRACKS = {
  2: {
    root: { min: 16, share: 40, max: 24 },
    detail: { ...DETAIL, share: 40 }
  },
  3: {
    root: { min: 20, share: 25, max: 24 },
    detail: { ...DETAIL, share: 32 }
  }
} as const satisfies Record<2 | 3, Record<'root' | 'detail', Track>>

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

export function visibleColumns(columns: number, levels: number): number {
  return Math.min(columns, levels)
}

const reservedBeside = (columns: number) =>
  PANE_MIN_FILL + (columns - 1) * PANE_GAP + PANE_ROW_PADDING

/** A parent track's width at a content width, both in rem; `pane-columns.css` computes the same. */
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

export function parentsOf(
  columns: number,
  top: number,
  levels: number
): number[] {
  return Array.from({ length: levels }, (_, depth) => depth).filter(
    (depth) => paneCell(columns, top, depth, levels).slot === 'parent'
  )
}

/** Content width, in rem, from which a row lays out `columns` columns; never below the two-column tier. */
export function rowTier(columns: number, top: number, levels: number): number {
  return Math.max(
    columnTier(2),
    columnTier(visibleColumns(columns, levels), parentsOf(columns, top, levels))
  )
}

const inspectorFits = (levels: number, content: number, width: number) => {
  const shown = Math.min(levels, PANE_MAX_COLUMNS)
  return Array.from({ length: levels }, (_, top) => top).every((top) => {
    const parents = parentsOf(shown, top, levels)
    if (content < rowTier(shown, top, levels)) return false
    const tracks = parents.reduce(
      (sum, depth) => sum + parentTrackWidth(shown, depth, parents, content),
      0
    )
    const fill = content - PANE_ROW_PADDING - tracks - width - shown * PANE_GAP
    return fill >= PANE_MIN_FILL
  })
}

// 1px: the fill only grows with the content within a tier, so the first fit holds from there up.
const PX = 1 / 16

/** Content width, in rem, from which the inspector fits beside every level present, at any top, and the fill keeps its minimum. */
export function inspectorTier(
  levels: number,
  size: PaneInspectorSize = 'sm'
): number {
  let content = columnTier(2)
  while (!inspectorFits(levels, content, PANE_INSPECTOR[size])) content += PX
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
