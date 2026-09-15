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
import type { CollectedSlots } from './collectSlots'
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

// Split by how often each part changes, so a consumer re-renders only for what it reads.

/** Callbacks, ids and refs: stable for the life of the root. */
export type NavigatorActions = {
  setValue: (next: string) => void
  setNavCollapsed: (next: boolean) => void
  setPrimaryNav: (next: PanePrimaryNav) => void
  setPinExpanded: (next: boolean) => void
  scrollActivePaneToTop: () => void
  /** Root found a direct-child Primary and reads its children. */
  primaryDerived: boolean
  /** Calls the current `onClick` of the item with this `value`, read at click time. */
  activateItem: (value: string) => void
  /** Calls the current `onClick` of that item's `index`th `Navigator.MenuItem`. */
  activateMenuItem: (value: string, index: number) => void
  setOverflowOpen: (next: boolean) => void
  /** Closes More for a destination that navigates: at once when uncontrolled, by the route when controlled. */
  closeOverflowOnRoute: () => void
  /** More pane id, for `aria-controls`. */
  overflowPaneId: string
  setOverflowItems: (
    surface: keyof NavigatorOverflowSets,
    next: NavigatorSlotMeta[]
  ) => void
  /** The More control that opened the pane, for returning focus. */
  overflowOpenerRef: RefObject<HTMLElement | null>
  /** Whether a `Navigator.Content` is a direct child of the root. */
  hasContent: boolean
  setOpenMenu: Dispatch<SetStateAction<string | null>>
  rememberSection: (section: string, href: string) => void
  declareSecondaryPane: (value: string) => () => void
  /** Present only when the app handles `showList`. */
  onShowListChange?: (next: boolean) => void
  setExpanded: (next: boolean) => void
  /** The vertical navigation also follows `<html data-navigator-expanded>`. */
  expandedFromDocument: boolean
  /** Id of the vertical navigation, for the toggle's `aria-controls`. */
  primaryId: string
}

/** What is selected, and the section it belongs to. */
export type NavigatorSelection = {
  value: string | undefined
  /** The direct-child Primary's walk; a new identity only when its structure changes. */
  collected: CollectedSlots
  slots: readonly NavigatorSlotMeta[]
  /** The branch-active section. */
  activeSection: NavigatorActiveSection | null
  /** The active section shows a list pane: not a page-first section on its own route. */
  listPaneShows: boolean
  /** The app asks for the active section's list on top. */
  showList: boolean
  /** Each section's last-reached destination. Empty on reload. */
  sectionMemory: SectionMemory
  /** Sections whose generated pane a `Navigator.SecondaryPane` replaces. */
  declaredSecondaryPanes: ReadonlySet<string>
}

/** More and the menus. */
export type NavigatorDisclosure = {
  overflowOpen: boolean
  /** `menuId(surface, value)` of the open menu, or null. */
  openMenu: string | null
  /** Folded items in author order, per orientation. Written by Primary. */
  overflowItems: NavigatorOverflowSets
}

export type NavigatorExpansion = {
  /** Whether the vertical navigation shows labels. Behaviour only; styling reads `data-expanded`. */
  expanded: boolean
  /** Following the document, which has not been read yet — the server render and hydration. */
  expandedPending: boolean
}

/** The phone bar's scroll-driven state. */
export type NavigatorBar = {
  navCollapsed: boolean
  primaryNav: PanePrimaryNav
  // Holds the bar open after tapping the collapsed active circle, until the next scroll down.
  pinExpanded: boolean
}

const noop = () => {}

export const NavigatorActionsContext = createContext<NavigatorActions>({
  setValue: noop,
  setNavCollapsed: noop,
  setPrimaryNav: noop,
  setPinExpanded: noop,
  scrollActivePaneToTop: noop,
  primaryDerived: false,
  activateItem: noop,
  activateMenuItem: noop,
  setOverflowOpen: noop,
  closeOverflowOnRoute: noop,
  overflowPaneId: '',
  setOverflowItems: noop,
  overflowOpenerRef: { current: null },
  hasContent: false,
  setOpenMenu: noop,
  rememberSection: noop,
  declareSecondaryPane: () => noop,
  setExpanded: noop,
  expandedFromDocument: false,
  primaryId: ''
})
NavigatorActionsContext.displayName = 'NavigatorActionsContext'

export const NavigatorSelectionContext = createContext<NavigatorSelection>({
  value: undefined,
  collected: {
    brand: [],
    toggles: [],
    cluster: [],
    pinned: [],
    automatic: [],
    pinnedSlots: [],
    hasStrayChild: false
  },
  slots: [],
  activeSection: null,
  listPaneShows: false,
  showList: false,
  sectionMemory: new Map(),
  declaredSecondaryPanes: new Set()
})
NavigatorSelectionContext.displayName = 'NavigatorSelectionContext'

export const NavigatorDisclosureContext = createContext<NavigatorDisclosure>({
  overflowOpen: false,
  openMenu: null,
  overflowItems: { horizontal: [], vertical: [] }
})
NavigatorDisclosureContext.displayName = 'NavigatorDisclosureContext'

export const NavigatorExpansionContext = createContext<NavigatorExpansion>({
  expanded: false,
  expandedPending: false
})
NavigatorExpansionContext.displayName = 'NavigatorExpansionContext'

export const NavigatorBarContext = createContext<NavigatorBar>({
  navCollapsed: false,
  primaryNav: 'auto',
  pinExpanded: false
})
NavigatorBarContext.displayName = 'NavigatorBarContext'

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
