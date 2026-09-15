import type { ReactElement, ReactNode } from 'react'

import type { BadgeProps } from '../Badge'
import type { NavigatorMenuProps } from './NavigatorMenu'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'

export const OVERFLOW_LABEL = 'More'

// Not configurable: a seven-tab bar is not a shape Navigator can be talked into.
const MAX_TABS = 5

export type NavigatorPlacement = 'automatic' | 'pinned'
export type NavigatorVisibilityPriority = 'low' | 'automatic' | 'high'

export type NavigatorSlotGroup = {
  key: string
  title?: ReactNode
  placement?: NavigatorPlacement
  priority?: NavigatorVisibilityPriority
}

export type NavigatorSlotMeta = {
  value: string
  label: ReactNode
  icon?: ReactNode
  badge?: ReactElement<BadgeProps>
  href?: string
  /** The item's own `href`; `href` falls back to the first sub-page. */
  declaredHref?: string
  /** The item's menu, when it declares one. A menu item never navigates. */
  menu?: ReactElement<NavigatorMenuProps>
  /** The section's landing value — itself if routed, else its first sub-page. */
  topValue: string
  /** Values of the section's `Navigator.Secondary` items, for branch-active. */
  descendants: string[]
  secondary?: NavigatorSecondaryProps
  group?: NavigatorSlotGroup
  /** The item's `onClick`, called wherever the item is activated. */
  onClick?: () => void
  placement: NavigatorPlacement
  priority: NavigatorVisibilityPriority
}

const RANK: Record<NavigatorVisibilityPriority, number> = {
  high: 2,
  automatic: 1,
  low: 0
}

export function rankSlots<T extends { priority: NavigatorVisibilityPriority }>(
  slots: readonly T[]
): T[] {
  return slots
    .map((slot, index) => ({ slot, index }))
    .sort(
      (a, b) =>
        RANK[b.slot.priority] - RANK[a.slot.priority] || a.index - b.index
    )
    .map(({ slot }) => slot)
}

// Kept slots come back in source order: priority picks members, not positions.
export function keepTopRanked<
  T extends { priority: NavigatorVisibilityPriority }
>(slots: readonly T[], count: number): { kept: T[]; folded: T[] } {
  const keep = new Set(rankSlots(slots).slice(0, Math.max(0, count)))
  return {
    kept: slots.filter((slot) => keep.has(slot)),
    folded: slots.filter((slot) => !keep.has(slot))
  }
}

export type MobileSlots = {
  tabs: NavigatorSlotMeta[]
  overflow: NavigatorSlotMeta[]
  pinned?: NavigatorSlotMeta
}

export const phoneBarCapacity = (hasCircle: boolean) =>
  hasCircle ? MAX_TABS - 1 : MAX_TABS

// Lives outside NavigatorPrimary.tsx: a second exported function there empties its docgen props table.
export function deriveMobileSlots(
  automatic: NavigatorSlotMeta[],
  pinned: NavigatorSlotMeta[]
): MobileSlots {
  const [circle, ...extraPinned] = pinned
  const capacity = phoneBarCapacity(circle !== undefined)
  const needsMore = automatic.length > capacity || extraPinned.length > 0
  if (!needsMore) return { tabs: automatic, overflow: [], pinned: circle }
  const { kept, folded } = keepTopRanked(automatic, capacity - 1)
  return { tabs: kept, overflow: [...folded, ...extraPinned], pinned: circle }
}
