import {
  type PaneKind,
  type PaneRegistration,
  type PaneStackPosition,
  isOverflowKind,
  isSectionKind
} from '../Pane/PaneStackContext'
import { type PaneDepth, ROLE_DEPTH } from '../Pane/paneDepth'
import type { PanePrimaryNav, PaneRole } from '../Pane/variants'

export type PaneEntry = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
  /** Place in the drill-down; document order breaks ties. */
  rank?: number
}

function stackOrder(entries: readonly PaneEntry[]): number[] {
  return entries
    .map((_, index) => index)
    .sort((a, b) => (entries[a]?.rank ?? 0) - (entries[b]?.rank ?? 0) || a - b)
}

/** The deepest `current` pane, or the root when revealed. Inspectors never count. */
export function deriveTopIndex(
  entries: readonly PaneEntry[],
  revealRoot = false
): number {
  if (revealRoot) {
    const root = deriveRootIndex(entries)
    if (root !== -1) return root
  }
  let top = -1
  for (const index of stackOrder(entries)) {
    const entry = entries[index]
    if (!entry || entry.role === 'inspector') continue
    // A leading inspector must not become the floor.
    if (top === -1 || entry.current) top = index
  }
  return top === -1 ? 0 : top
}

/** The shallowest non-inspector; -1 when none. */
export function deriveRootIndex(entries: readonly PaneEntry[]): number {
  return (
    stackOrder(entries).find((index) => entries[index]?.role !== 'inspector') ??
    -1
  )
}

/** Document order: mount order isn't visual order through slots. */
export function orderByDocumentPosition<T extends { node: HTMLElement }>(
  entries: readonly T[]
): T[] {
  return [...entries].sort((a, b) =>
    a.node === b.node
      ? 0
      : a.node.compareDocumentPosition(b.node) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1
  )
}

/** `top`, `ahead` (deeper) or `behind`; null for an inspector. */
export function derivePositions(
  entries: readonly PaneEntry[],
  revealRoot = false
): (PaneStackPosition | null)[] {
  const top = deriveTopIndex(entries, revealRoot)
  const place: number[] = []
  stackOrder(entries).forEach((index, at) => {
    place[index] = at
  })
  const topPlace = place[top] ?? 0
  return entries.map((entry, index) =>
    entry.role === 'inspector'
      ? null
      : index === top
        ? 'top'
        : (place[index] ?? 0) > topPlace
          ? 'ahead'
          : 'behind'
  )
}

/** Position before registration (SSR, hydration): the section list is root, More last. */
export function provisionalPosition(
  { role, current, kind }: PaneRegistration,
  revealRoot: boolean
): PaneStackPosition | null {
  if (role === 'inspector') return null
  if (isSectionKind(kind)) {
    return revealRoot ? 'top' : 'behind'
  }
  if (isOverflowKind(kind)) {
    return current ? 'top' : 'ahead'
  }
  if (revealRoot) return 'ahead'
  return current ? 'top' : null
}

export type DepthEntry = {
  role: PaneRole
  kind: PaneKind
  depth?: PaneDepth
  current?: boolean
}

/** A pane's depth before it registers: declared, else its role's default. More is always the root. */
export function provisionalDepth({
  role,
  kind,
  depth
}: DepthEntry): number | null {
  if (role === 'inspector') return null
  if (isOverflowKind(kind)) return 0
  return depth ?? ROLE_DEPTH[role]
}

/** Registered depths: declared or role default, document order between equals, no gaps. */
export function resolveDepths(
  entries: readonly DepthEntry[]
): (number | null)[] {
  const ranked = entries
    .flatMap((entry, index) => {
      const depth = provisionalDepth(entry)
      return depth === null ||
        isOverflowKind(entry.kind) ||
        isSectionKind(entry.kind)
        ? []
        : [{ index, depth }]
    })
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
  const sectionList = entries.some((entry) => isSectionKind(entry.kind))
  // Open More fills a vacant root; it never displaces a list.
  const moreFillsRoot =
    entries.some(
      (entry) => isOverflowKind(entry.kind) && entry.current === true
    ) && (ranked[0]?.depth ?? 0) > 0
  const offset = sectionList || moreFillsRoot ? 1 : 0
  const depths = entries.map((entry): number | null =>
    entry.role === 'inspector' ? null : 0
  )
  ranked.forEach(({ index }, rank) => {
    depths[index] = rank + offset
  })
  return depths
}
