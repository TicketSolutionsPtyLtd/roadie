'use client'

import { type ReactNode, type RefObject, createContext } from 'react'

import type { PanePrimaryNav } from '../Pane/variants'
import type { NavigatorSlotMeta } from './NavigatorPrimary'
import type { SectionMemory } from './sectionMemory'

// Lifted so the top pane's header, a different subtree, can render it.
export type NavigatorSecondaryNav = {
  'aria-label': string
  className?: string
  children: ReactNode
}

export type NavigatorOverflowSets = {
  horizontal: NavigatorSlotMeta[]
  vertical: NavigatorSlotMeta[]
}

export type NavigatorContextValue = {
  value: string | undefined
  setValue: (next: string) => void
  hasNesting: boolean
  setHasNesting: (next: boolean) => void
  navCollapsed: boolean
  setNavCollapsed: (next: boolean) => void
  // The top pane's declaration, republished by Navigator.Content.
  primaryNav: PanePrimaryNav
  setPrimaryNav: (next: PanePrimaryNav) => void
  // Holds the bar open after tapping the collapsed active circle, until the next scroll down.
  pinExpanded: boolean
  setPinExpanded: (next: boolean) => void
  scrollActivePaneToTop: () => void
  setActivePaneScroller: (scroller: (() => void) | null) => void
  secondaryNav: NavigatorSecondaryNav | null
  setSecondaryNav: (next: NavigatorSecondaryNav | null) => void
  overflowOpen: boolean
  setOverflowOpen: (next: boolean) => void
  /** Id the More tab points `aria-controls` at, and the overflow pane carries. */
  overflowPaneId: string
  /** Folded items in author order, per orientation. Written by Primary. */
  overflowItems: NavigatorOverflowSets
  setOverflowItems: (
    surface: keyof NavigatorOverflowSets,
    next: NavigatorSlotMeta[]
  ) => void
  /** The More control that opened the pane, for returning focus. */
  overflowOpener: RefObject<HTMLElement | null>
  /** Whether a `Navigator.Content` is a direct child of the root. */
  hasContent: boolean
  /** `menuId(surface, value)` of the open menu, or null. */
  openMenu: string | null
  setOpenMenu: (next: string | null) => void
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
  overflowItems: { horizontal: [], vertical: [] },
  setOverflowItems: () => {},
  overflowOpener: { current: null },
  hasContent: false,
  openMenu: null,
  setOpenMenu: () => {},
  sectionMemory: new Map(),
  rememberSection: () => {}
})

export const isActiveValue = (
  itemValue: string,
  activeValue: string | undefined
) => itemValue === activeValue

// Prefix matching keeps a section lit on sub-routes its tree never declares.
export const isBranchActive = (
  itemValue: string,
  descendantValues: string[],
  activeValue: string | undefined
) =>
  isActiveValue(itemValue, activeValue) ||
  descendantValues.some((value) => isActiveValue(value, activeValue)) ||
  (activeValue !== undefined && activeValue.startsWith(`${itemValue}/`))

// A menu item owns a menu, not a destination, so no route may light it.
export const isSectionActive = (
  item: Pick<NavigatorSlotMeta, 'value' | 'descendants' | 'menu'>,
  activeValue: string | undefined
) => !item.menu && isBranchActive(item.value, item.descendants, activeValue)
