import type { ReactNode } from 'react'

import { MAX_TABS } from './variants'

export const OVERFLOW_LABEL = 'More'

export type NavigatorPlacement = 'automatic' | 'pinned'
export type NavigatorVisibilityPriority = 'low' | 'automatic' | 'high'

/** The section an item was declared in, so the overflow can keep it. */
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
  href?: string
  /** The item's menu, when it declares one. A panel item never navigates. */
  panel?: ReactNode
  /** The section's landing value — itself if routed, else its first sub-page. */
  topValue: string
  /** Values of the section's `Navigator.Secondary` items, for branch-active. */
  descendants: string[]
  group?: NavigatorSlotGroup
  placement: NavigatorPlacement
  priority: NavigatorVisibilityPriority
}

const RANK: Record<NavigatorVisibilityPriority, number> = {
  high: 2,
  automatic: 1,
  low: 0
}

/** Highest priority first; ties keep source order. */
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

/** The horizontal slots, declared explicitly; the fifth is always More. */
export type NavigatorTabSlots =
  | readonly [string]
  | readonly [string, string]
  | readonly [string, string, string]
  | readonly [string, string, string, string]

export type MobileSlots = {
  /** Rendered as tabs, in author order. */
  tabs: NavigatorSlotMeta[]
  /** Primary items that folded out of the bar. Empty when nothing folded. */
  overflow: NavigatorSlotMeta[]
  /** Every item declared inside `Navigator.End`, in author order. */
  end: NavigatorSlotMeta[]
  /**
   * The final tab's label, or `undefined` when there is no final tab —
   * nothing folded and no End was declared.
   */
  label: ReactNode
  /** Declared tab values with no matching item — a dev-mode warning. */
  unknownTabs: string[]
  /** Declared tab values repeated after their first occurrence — a dev-mode warning. */
  repeatedTabs: string[]
  /**
   * Declared tab values beyond the `MAX_TABS - 1` cap — folded into overflow
   * with a dev-mode warning. `NavigatorTabSlots` caps a typed caller at four
   * values, but `deriveMobileSlots` is exported and callable directly with a
   * longer array, so this is the runtime backstop for that seam.
   */
  overflowTabs: string[]
}

/**
 * Mobile slots are primary items plus one for End. At or under MAX_TABS the
 * tree renders as authored. Over it, the first MAX_TABS - 1 items are kept
 * and the tail folds into the final tab alongside End's contents.
 *
 * The final tab's label follows what it holds: a lone End item lends its
 * own label, anything more is `More`.
 *
 * Kept in its own module, not alongside `NavigatorPrimary`: a second
 * substantial exported function in that file confuses
 * `react-docgen-typescript`'s component detection and silently empties the
 * whole `NavigatorPrimaryProps` table on the docs site.
 */
export function deriveMobileSlots(
  items: NavigatorSlotMeta[],
  endItems: NavigatorSlotMeta[],
  tabs?: NavigatorTabSlots
): MobileSlots {
  if (tabs) {
    const byValue = new Map(items.map((item) => [item.value, item]))
    const chosen: NavigatorSlotMeta[] = []
    const named = new Set<string>()
    const unknownTabs: string[] = []
    const repeatedTabs: string[] = []
    const overflowTabs: string[] = []
    tabs.forEach((value) => {
      if (named.has(value)) {
        repeatedTabs.push(value)
        return
      }
      const item = byValue.get(value)
      if (!item) {
        unknownTabs.push(value)
        return
      }
      named.add(value)
      // Untyped callers can pass more; the stylesheet assumes five columns.
      if (chosen.length >= MAX_TABS - 1) {
        overflowTabs.push(value)
        return
      }
      chosen.push(item)
    })
    const chosenValues = new Set(chosen.map((item) => item.value))
    // Everything the array does not choose folds, whatever its source
    // position — declaring the tabs is declaring the whole membership rule,
    // not a prefix. A named value bumped by the cap above folds the same way
    // an unnamed one does.
    const overflow = items.filter((item) => !chosenValues.has(item.value))
    const foldedCount = overflow.length + endItems.length
    return {
      tabs: chosen,
      overflow,
      end: endItems,
      // A lone End item lends its own label; any overflow is `More`.
      label:
        foldedCount === 0
          ? undefined
          : overflow.length === 0 && endItems.length === 1
            ? endItems[0]?.label
            : OVERFLOW_LABEL,
      unknownTabs,
      repeatedTabs,
      overflowTabs
    }
  }

  const total = items.length + (endItems.length > 0 ? 1 : 0)

  if (total > MAX_TABS) {
    return {
      tabs: items.slice(0, MAX_TABS - 1),
      overflow: items.slice(MAX_TABS - 1),
      end: endItems,
      label: OVERFLOW_LABEL,
      unknownTabs: [],
      repeatedTabs: [],
      overflowTabs: []
    }
  }

  return {
    tabs: items,
    overflow: [],
    end: endItems,
    label:
      endItems.length === 0
        ? undefined
        : endItems.length > 1
          ? OVERFLOW_LABEL
          : endItems[0]?.label,
    unknownTabs: [],
    repeatedTabs: [],
    overflowTabs: []
  }
}
