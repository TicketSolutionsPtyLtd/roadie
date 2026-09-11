'use client'

import { type ReactNode, createContext } from 'react'

import type { PanePrimaryNav } from '../Pane/variants'
import type { NavigatorSlotMeta } from './NavigatorPrimary'
import type { SectionMemory } from './sectionMemory'

// The active section's secondary navigation, lifted so the top pane's header —
// a different subtree — can render it as the mobile nav row. Navigator.Primary
// is the sole writer.
export type NavigatorSecondaryNav = {
  'aria-label': string
  className?: string
  children: ReactNode
}

export type NavigatorContextValue = {
  value: string | undefined
  setValue: (next: string) => void
  hasNesting: boolean
  setHasNesting: (next: boolean) => void
  navCollapsed: boolean
  setNavCollapsed: (next: boolean) => void
  // The top pane's declaration, republished by Navigator.Content. Navigator
  // never reads a pane's DOM for it — depth is resolved in JS, and whether
  // depth matters is left to CSS.
  primaryNav: PanePrimaryNav
  setPrimaryNav: (next: PanePrimaryNav) => void
  // A manual-expand pin. Tapping the collapsed active circle sets it, holding
  // the bar open even while the pane is still scrolled — `syncBar` skips its
  // collapse while pinned. Cleared when the user scrolls down again.
  pinExpanded: boolean
  setPinExpanded: (next: boolean) => void
  // Tapping the expanded active tab scrolls the visible pane to the top. The
  // visible pane registers its own scroller so the tab bar — a different
  // subtree — can call it.
  scrollActivePaneToTop: () => void
  setActivePaneScroller: (scroller: (() => void) | null) => void
  secondaryNav: NavigatorSecondaryNav | null
  setSecondaryNav: (next: NavigatorSecondaryNav | null) => void
  // The mobile overflow — a full-screen Pane in Task 5 — read and written from
  // both Navigator.Primary (the More tab) and Navigator.Content (the pane).
  overflowOpen: boolean
  setOverflowOpen: (next: boolean) => void
  /** Id the More tab points `aria-controls` at, and the overflow pane carries. */
  overflowPaneId: string
  /** Folded primary items plus End's, in author order. Written by Primary. */
  overflowItems: NavigatorSlotMeta[]
  setOverflowItems: (next: NavigatorSlotMeta[]) => void
  /**
   * Whether a `Navigator.Content` is mounted — for the dev warning in Task 5.
   * Derived by `NavigatorRoot` from its own direct children, not registered
   * by `Content` itself: a child-effect registration raced against
   * `Navigator.Primary`'s "no host" warning, which reads this on mount.
   * Consequently `Navigator.Content` must be a direct child of `Navigator` —
   * wrapping it (Suspense, a layout div, a helper component) makes it
   * invisible to the walk and fires a false "no host" warning.
   */
  hasContent: boolean
  /** The value of the item whose panel is open, or null. */
  openPanel: string | null
  setOpenPanel: (next: string | null) => void
  /**
   * Every declared panel item's meta — tab, folded, and `Navigator.End` alike
   * — so `Navigator.Content` can find the open one's content by value.
   * `overflowItems` only carries folded items, which isn't every panel.
   * Written by `Navigator.Primary`.
   */
  panelItems: NavigatorSlotMeta[]
  setPanelItems: (next: NavigatorSlotMeta[]) => void
  /** Each section's last-reached destination. Empty on reload. */
  sectionMemory: SectionMemory
  rememberSection: (section: string, href: string) => void
}

export const NavigatorContext = createContext<NavigatorContextValue>({
  value: undefined,
  setValue: () => {},
  hasNesting: false,
  setHasNesting: () => {},
  navCollapsed: false,
  setNavCollapsed: () => {},
  primaryNav: 'auto',
  setPrimaryNav: () => {},
  pinExpanded: false,
  setPinExpanded: () => {},
  scrollActivePaneToTop: () => {},
  setActivePaneScroller: () => {},
  secondaryNav: null,
  setSecondaryNav: () => {},
  overflowOpen: false,
  setOverflowOpen: () => {},
  overflowPaneId: '',
  overflowItems: [],
  setOverflowItems: () => {},
  hasContent: false,
  openPanel: null,
  setOpenPanel: () => {},
  panelItems: [],
  setPanelItems: () => {},
  sectionMemory: new Map(),
  rememberSection: () => {}
})

// The single definition of "am I active". Both the item gating its own
// Secondary and Primary picking the active item's Secondary for the strip
// have to answer it the same way, or the two presentations disagree.
export const isActiveValue = (
  itemValue: string,
  activeValue: string | undefined
) => itemValue === activeValue

// A section is branch-active when it is itself current, OR the current
// destination is one of its declared Secondary descendants, OR the current
// destination is nested under its value as a route prefix.
//
// Prefix matching is what lets a section stay lit on a page it never declares
// — a list rendered as its own `Pane` rather than a `Navigator.Secondary`, or
// a route mounted beneath the section that the tree can't enumerate.
export const isBranchActive = (
  itemValue: string,
  descendantValues: string[],
  activeValue: string | undefined
) =>
  isActiveValue(itemValue, activeValue) ||
  descendantValues.some((value) => isActiveValue(value, activeValue)) ||
  (activeValue !== undefined && activeValue.startsWith(`${itemValue}/`))

// A panel owns a menu, not a destination. Route-prefix matching exists to
// light up a section whose sub-pages the declared tree can't enumerate — a
// panel has no sub-pages, so the prefix clause must never reach it, or a
// button that opens a menu and navigates nowhere announces itself as the
// current page.
export const isSectionActive = (
  item: Pick<NavigatorSlotMeta, 'value' | 'descendants' | 'panel'>,
  activeValue: string | undefined
) => !item.panel && isBranchActive(item.value, item.descendants, activeValue)
