import type {
  PaneRegistration,
  PaneStackPosition
} from '../Pane/PaneStackContext'
import type { PanePrimaryNav, PaneRole } from '../Pane/variants'

export type PaneEntry = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
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
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!entry || entry.role === 'inspector') continue
    // A leading inspector must not become the floor.
    if (top === -1 || entry.current) top = index
  }
  return top === -1 ? 0 : top
}

/**
 * The base of the stack — the first entry that can hold a position at all.
 * An `inspector` never participates, the same exclusion `deriveTopIndex` and
 * `derivePositions` apply to every other entry. Unlike `deriveTopIndex`,
 * there is no non-empty fallback: a stack of only inspectors has no root.
 */
export function deriveRootIndex(entries: readonly PaneEntry[]): number {
  return entries.findIndex((entry) => entry.role !== 'inspector')
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
 * Each pane's position, given the ordered stack. `top` is the deepest
 * `current` pane; anything after it is `ahead` (not yet reached), anything
 * before it is `behind` (already visited). An `inspector` never participates.
 */
export function derivePositions(
  entries: readonly PaneEntry[],
  revealRoot = false
): (PaneStackPosition | null)[] {
  const top = deriveTopIndex(entries, revealRoot)
  return entries.map((entry, index) =>
    entry.role === 'inspector'
      ? null
      : index === top
        ? 'top'
        : index > top
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
