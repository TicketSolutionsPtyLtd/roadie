import type {
  PaneKind,
  PaneRegistration,
  PaneStackPosition
} from '../Pane/PaneStackContext'
import { type PaneDepth, ROLE_DEPTH } from '../Pane/paneColumns'
import type { PanePrimaryNav, PaneRole } from '../Pane/variants'

export type PaneEntry = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
  /** Place in the drill-down; document order breaks ties. */
  rank?: number
}

// Rank first, document order between equals.
function stackOrder(entries: readonly PaneEntry[]): number[] {
  return entries
    .map((_, index) => index)
    .sort((a, b) => (entries[a]?.rank ?? 0) - (entries[b]?.rank ?? 0) || a - b)
}

/**
 * Which declared pane is the top of the stack: the deepest `current` pane, or
 * the root when the orchestrator reveals it — on a section's own route, or
 * when the app asks for the list (`showList`). An `inspector` never
 * participates. Band-independent: whether depth matters is CSS's call.
 */
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

/**
 * The base of the stack — the shallowest entry that can hold a position at
 * all. An `inspector` never participates, the same exclusion `deriveTopIndex`
 * and `derivePositions` apply to every other entry. Unlike `deriveTopIndex`,
 * there is no non-empty fallback: a stack of only inspectors has no root.
 */
export function deriveRootIndex(entries: readonly PaneEntry[]): number {
  return (
    stackOrder(entries).find((index) => entries[index]?.role !== 'inspector') ??
    -1
  )
}

/**
 * Registered panes in document order. Mount order is not visual order when
 * panes arrive through slots the orchestrator did not render, so the DOM is
 * the authority on which pane is ahead of which.
 *
 * Assumes every node is attached — registration only runs post-mount, so
 * `compareDocumentPosition`'s undefined ordering for detached nodes doesn't
 * apply here.
 */
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

/**
 * Each pane's position, given the stack. `top` is the deepest `current` pane;
 * anything deeper is `ahead` (not yet reached), anything shallower `behind`
 * (already visited). An `inspector` never participates.
 */
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

/**
 * A pane's position before it registers — in the server render and the one
 * that hydrates it — when DOM order is not yet known. The section's list pane
 * renders first, so it is the root; More renders last. Any other pane that
 * is neither `current` nor behind a revealed root stays unplaced.
 */
export function provisionalPosition(
  { role, current, kind }: PaneRegistration,
  revealRoot: boolean
): PaneStackPosition | null {
  if (role === 'inspector') return null
  if (kind === 'section' || kind === 'generated-section') {
    return revealRoot ? 'top' : 'behind'
  }
  if (kind === 'overflow' || kind === 'generated-overflow') {
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

const isOverflow = (kind: PaneKind) =>
  kind === 'overflow' || kind === 'generated-overflow'

const isSectionList = (kind: PaneKind) =>
  kind === 'section' || kind === 'generated-section'

/** A pane's depth before it registers: declared, else its role's default. More is always the root. */
export function provisionalDepth({
  role,
  kind,
  depth
}: DepthEntry): number | null {
  if (role === 'inspector') return null
  if (isOverflow(kind)) return 0
  return depth ?? ROLE_DEPTH[role]
}

/**
 * Depths once registered: declared or role default first, document order only
 * between equals, with no gaps. More and the section list sit at 0 and take no
 * rank; open More pushes the ranked panes down one only when the root is empty.
 */
export function resolveDepths(
  entries: readonly DepthEntry[]
): (number | null)[] {
  const ranked = entries
    .flatMap((entry, index) => {
      const depth = provisionalDepth(entry)
      return depth === null ||
        isOverflow(entry.kind) ||
        isSectionList(entry.kind)
        ? []
        : [{ index, depth }]
    })
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
  const sectionList = entries.some((entry) => isSectionList(entry.kind))
  // Open More fills a vacant root; it never displaces a list.
  const moreFillsRoot =
    entries.some((entry) => isOverflow(entry.kind) && entry.current === true) &&
    (ranked[0]?.depth ?? 0) > 0
  const offset = sectionList || moreFillsRoot ? 1 : 0
  const depths = entries.map((entry): number | null =>
    entry.role === 'inspector' ? null : 0
  )
  ranked.forEach(({ index }, rank) => {
    depths[index] = rank + offset
  })
  return depths
}
