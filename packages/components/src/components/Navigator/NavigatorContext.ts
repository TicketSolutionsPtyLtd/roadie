'use client'

import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  createContext
} from 'react'

import type { PanePrimaryNav } from '../Pane/variants'
import type {
  NavigatorSecondaryProps,
  NavigatorSecondaryRoot
} from './NavigatorSecondary'
import type { NavigatorSlotMeta } from './mobileSlots'
import type { SectionMemory } from './sectionMemory'

export type NavigatorActiveSection = {
  value: string
  /** The section route; undefined only for a routeless section. */
  href?: string
  label: ReactNode
  secondary: NavigatorSecondaryProps
  /** `'page'` only with an `href`; a routeless section is `'list'`. */
  root: NavigatorSecondaryRoot
}

export type NavigatorOverflowSets = {
  horizontal: NavigatorSlotMeta[]
  vertical: NavigatorSlotMeta[]
}

export type NavigatorContextValue = {
  value: string | undefined
  setValue: (next: string) => void
  navCollapsed: boolean
  setNavCollapsed: (next: boolean) => void
  // The top pane's declaration, republished by Navigator.Content.
  primaryNav: PanePrimaryNav
  setPrimaryNav: (next: PanePrimaryNav) => void
  // Holds the bar open after tapping the collapsed active circle, until the next scroll down.
  pinExpanded: boolean
  setPinExpanded: (next: boolean) => void
  scrollActivePaneToTop: () => void
  registerActivePaneScroller: (scroller: () => void) => () => void
  /** A direct-child Primary's children, or those a wrapped Primary published. */
  primaryChildren: ReactNode
  setPrimaryChildren: (next: ReactNode) => void
  /** Root read the Primary's children during render, so Primary needn't publish them. */
  primaryDerived: boolean
  /** Calls the current `onClick` of the item with this `value`, read at click time. */
  activateItem: (value: string) => void
  /** Calls the current `onClick` of the `index`th `Navigator.MenuItem` in that item's menu. */
  activateMenuItem: (value: string, index: number) => void
  /** The branch-active section, walked from `primaryChildren`. */
  activeSection: NavigatorActiveSection | null
  /** The active section shows a list pane: not a page-first section on its own route. */
  listPaneShows: boolean
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
  overflowOpenerRef: RefObject<HTMLElement | null>
  /** Whether a `Navigator.Content` is a direct child of the root. */
  hasContent: boolean
  /** `menuId(surface, value)` of the open menu, or null. */
  openMenu: string | null
  setOpenMenu: Dispatch<SetStateAction<string | null>>
  /** Each section's last-reached destination. Empty on reload. */
  sectionMemory: SectionMemory
  rememberSection: (section: string, href: string) => void
  /** Sections whose generated pane a `Navigator.SecondaryPane` replaces. */
  declaredSecondaryPanes: ReadonlySet<string>
  declareSecondaryPane: (value: string) => () => void
  /** The app asks for the active section's list on top. */
  showList: boolean
  onShowListChange?: (next: boolean) => void
  /** Whether the vertical navigation shows labels. Behaviour only; styling reads `data-expanded`. */
  expanded: boolean
  setExpanded: (next: boolean) => void
  /** The vertical navigation also follows `<html data-navigator-expanded>`. */
  expandedFromDocument: boolean
  /** Following the document, which has not been read yet — the server render and hydration. */
  expandedPending: boolean
  /** Id of the vertical navigation, for the toggle's `aria-controls`. */
  primaryId: string
}

export const NavigatorContext = createContext<NavigatorContextValue>({
  value: undefined,
  setValue: () => {},
  navCollapsed: false,
  setNavCollapsed: () => {},
  primaryNav: 'auto',
  setPrimaryNav: () => {},
  pinExpanded: false,
  setPinExpanded: () => {},
  scrollActivePaneToTop: () => {},
  registerActivePaneScroller: () => () => {},
  primaryChildren: null,
  setPrimaryChildren: () => {},
  primaryDerived: false,
  activateItem: () => {},
  activateMenuItem: () => {},
  activeSection: null,
  listPaneShows: false,
  overflowOpen: false,
  setOverflowOpen: () => {},
  overflowPaneId: '',
  overflowItems: { horizontal: [], vertical: [] },
  setOverflowItems: () => {},
  overflowOpenerRef: { current: null },
  hasContent: false,
  openMenu: null,
  setOpenMenu: () => {},
  sectionMemory: new Map(),
  rememberSection: () => {},
  declaredSecondaryPanes: new Set(),
  declareSecondaryPane: () => () => {},
  showList: false,
  expanded: false,
  setExpanded: () => {},
  expandedFromDocument: false,
  expandedPending: false,
  primaryId: ''
})
NavigatorContext.displayName = 'NavigatorContext'

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
