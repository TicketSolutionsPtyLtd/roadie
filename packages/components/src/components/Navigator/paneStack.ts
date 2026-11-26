import {
  type PaneKind,
  type PaneRegistration,
  type PaneStackPosition,
  isOverflowKind,
  isSecondaryKind
} from '../Pane/PaneStackContext'
import { COLUMN_DEPTH, type PaneDepth } from '../Pane/paneDepth'
import type { PaneColumn, PaneTabBar } from '../Pane/variants'

export type PaneEntry = {
  column: PaneColumn
  reached: boolean
  /** Unused here; carried because registrations are passed in whole. */
  tabBar?: PaneTabBar
  /** Place in the drill-down; document order breaks ties. */
  rank?: number
}

function stackOrder(entries: readonly PaneEntry[]): number[] {
  return entries
    .map((_, index) => index)
    .sort((a, b) => (entries[a]?.rank ?? 0) - (entries[b]?.rank ?? 0) || a - b)
}

/** The deepest reached pane, or the root when revealed. Inspectors never count. */
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
    if (!entry || entry.column === 'inspector') continue
    // A leading inspector must not become the floor.
    if (top === -1 || entry.reached) top = index
  }
  return top === -1 ? 0 : top
}

/** The shallowest non-inspector; -1 when none. */
export function deriveRootIndex(entries: readonly PaneEntry[]): number {
  return (
    stackOrder(entries).find(
      (index) => entries[index]?.column !== 'inspector'
    ) ?? -1
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
    entry.column === 'inspector'
      ? null
      : index === top
        ? 'top'
        : (place[index] ?? 0) > topPlace
          ? 'ahead'
          : 'behind'
  )
}

/** Position before registration (SSR, hydration): the secondary list is root, More last. */
export function provisionalPosition(
  { column, reached, kind }: PaneRegistration,
  revealRoot: boolean
): PaneStackPosition | null {
  if (column === 'inspector') return null
  if (isSecondaryKind(kind)) {
    return revealRoot ? 'top' : 'behind'
  }
  if (isOverflowKind(kind)) {
    return reached ? 'top' : 'ahead'
  }
  if (revealRoot) return 'ahead'
  return reached ? 'top' : null
}

export type DepthEntry = {
  column: PaneColumn
  kind: PaneKind
  depth?: PaneDepth
  reached?: boolean
}

/** A pane's depth before it registers: declared, else its column's default. More is always the root. */
export function provisionalDepth({
  column,
  kind,
  depth
}: DepthEntry): number | null {
  if (column === 'inspector') return null
  if (isOverflowKind(kind)) return 0
  return depth ?? COLUMN_DEPTH[column]
}

/** Registered depths: declared or column default, document order between equals, no gaps. */
export function resolveDepths(
  entries: readonly DepthEntry[]
): (number | null)[] {
  const ranked = entries
    .flatMap((entry, index) => {
      const depth = provisionalDepth(entry)
      return depth === null ||
        isOverflowKind(entry.kind) ||
        isSecondaryKind(entry.kind)
        ? []
        : [{ index, depth }]
    })
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
  const secondaryList = entries.some((entry) => isSecondaryKind(entry.kind))
  // Open More fills a vacant root; it never displaces a list.
  const moreFillsRoot =
    entries.some(
      (entry) => isOverflowKind(entry.kind) && entry.reached === true
    ) && (ranked[0]?.depth ?? 0) > 0
  const offset = secondaryList || moreFillsRoot ? 1 : 0
  const depths = entries.map((entry): number | null =>
    entry.column === 'inspector' ? null : 0
  )
  ranked.forEach(({ index }, rank) => {
    depths[index] = rank + offset
  })
  return depths
}

export type PlacedPane = { id: string } & PaneRegistration

/** What this render draws, not the snapshot, which learns of a pane a commit late. */
export type DrawnPanes = {
  /** The active secondary has a list, drawn or displaced by More. */
  rootList: boolean
  rootListDrawn: boolean
  secondaryPane: boolean
  overflow: boolean
  moreOpen: boolean
}

/** Where a pane rendered while hydrating: `written` is drawn, `rank` is what registration should resolve. */
type RenderClaim = {
  pane: PlacedPane
  written: number | null
  rank: number | null
}
/** In render order: Fizz and hydration both walk the row in document order. */
export type RenderClaims = Map<string, RenderClaim>

const SECONDARY_ROOT: DepthEntry = {
  column: 'list',
  kind: 'generated-secondary'
}
const OPEN_MORE: DepthEntry = {
  column: 'list',
  kind: 'generated-overflow',
  reached: true
}

/** Each drawn pane's depth in the row. */
export function depthsOf(panes: readonly PlacedPane[], draws: DrawnPanes) {
  const drawn = panes.filter((pane) => {
    if (pane.kind === 'generated-secondary') return draws.secondaryPane
    if (pane.kind === 'secondary') return draws.rootListDrawn
    if (pane.kind === 'generated-overflow') return draws.overflow
    return true
  })
  const rootPending =
    draws.rootList && !drawn.some((pane) => isSecondaryKind(pane.kind))
  const morePending =
    draws.moreOpen && !drawn.some((pane) => isOverflowKind(pane.kind))
  const held = [
    ...(rootPending ? [SECONDARY_ROOT] : []),
    ...(morePending ? [OPEN_MORE] : [])
  ]
  const resolved = resolveDepths([...held, ...drawn])
  const shift = held.length
  return new Map(
    drawn.map((pane, index) => [pane.id, resolved[index + shift] ?? null])
  )
}

// True when this row's ranks sit one shallower than the written scale.
function liftOf(
  panes: readonly PlacedPane[],
  depths: ReadonlyMap<string, number | null>
): boolean {
  const first = panes.find((pane) => (depths.get(pane.id) ?? null) !== null)
  return (
    first !== undefined &&
    depths.get(first.id) === 0 &&
    (provisionalDepth(first) ?? 0) > 0
  )
}

// A declared depth wins; a row opening on a detail is written from 1 so More can take 0.
function renderOrderDepth(
  panes: readonly PlacedPane[],
  draws: DrawnPanes
): Omit<RenderClaim, 'pane'> {
  const pane = panes.at(-1)
  if (pane?.depth !== undefined) {
    const written = provisionalDepth(pane)
    return { written, rank: written }
  }
  const depths = depthsOf(panes, draws)
  const rank = pane ? (depths.get(pane.id) ?? null) : null
  const lift = liftOf(panes, depths)
  return { written: rank === null ? null : rank + (lift ? 1 : 0), rank }
}

/** The depth a pane is served at while hydrating, from the panes rendered before it; a pane claims once. */
export function claimRenderedDepth(
  claims: RenderClaims,
  pane: PlacedPane,
  draws: DrawnPanes
) {
  const claimed = claims.get(pane.id)
  if (claimed) return claimed.written
  const before = Array.from(claims.values(), (claim) => claim.pane)
  const claim = { pane, ...renderOrderDepth([...before, pane], draws) }
  claims.set(pane.id, claim)
  return claim.written
}

/** Each live pane that was served, with the depth it sits at when that differs. */
export function servedClaims(
  live: readonly PlacedPane[],
  draws: DrawnPanes,
  claims: RenderClaims
): { id: string; served: number | null; sits: number | null }[] {
  const resolved = depthsOf(live, draws)
  const lift = liftOf(live, resolved)
  return live.flatMap(({ id }) => {
    const claim = claims.get(id)
    if (!claim) return []
    const rank = resolved.get(id) ?? null
    const moved = rank !== null && claim.written !== null && claim.rank !== rank
    return [
      { id, served: claim.written, sits: moved ? rank + (lift ? 1 : 0) : null }
    ]
  })
}
