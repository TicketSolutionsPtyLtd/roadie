'use client'

import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  createContext
} from 'react'

import type { PaneTabBar } from '../Pane/variants'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'
import { type CollectedSlots, collectSlots } from './collectSlots'
import type { NavigatorSlotMeta } from './mobileSlots'

export type NavigatorActiveSecondary = {
  value: string
  /** The destination route; undefined only for a routeless destination. */
  href?: string
  label: ReactNode
  props: NavigatorSecondaryProps
  /** Only with an `href`; a routeless destination has no overview. */
  overview: boolean
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
  setTabBar: (next: PaneTabBar) => void
  setPinExpanded: (next: boolean) => void
  scrollActivePaneToTop: () => void
  /** Root found a direct-child Primary and reads its children. */
  primaryDerived: boolean
  /** Calls the current `onSelect` of the item with this `value`, read at click time. */
  activateItem: (value: string) => void
  /** Calls the current `onSelect` of that item's `index`th `Navigator.MenuItem`. */
  activateMenuItem: (value: string, index: number) => void
  setOverflowOpen: (next: boolean) => void
  /** Closes More for a destination that navigates: at once when uncontrolled, by the route when controlled. */
  closeOverflowOnRoute: () => void
  overflowPaneId: string
  setOverflowItems: (
    surface: keyof NavigatorOverflowSets,
    next: NavigatorSlotMeta[]
  ) => void
  overflowOpenerRef: RefObject<HTMLElement | null>
  setOpenMenu: Dispatch<SetStateAction<string | null>>
  declareSecondaryPane: (value: string) => () => void
  /** Present only when the app handles `showList`. */
  onShowListChange?: (next: boolean) => void
  setExpanded: (next: boolean) => void
  /** The vertical navigation also follows `<html data-navigator-expanded>`. */
  expandedFromDocument: boolean
  primaryId: string
}

export type NavigatorSelection = {
  value: string | undefined
  /** The direct-child Primary's walk; a new identity only when its structure changes. */
  collected: CollectedSlots
  activeSecondary: NavigatorActiveSecondary | null
  /** The active secondary shows a list pane: not an overview on its own route. */
  listPaneShows: boolean
  showList: boolean
  /** Destinations whose generated pane a `Navigator.SecondaryPane` replaces. */
  declaredSecondaryPanes: ReadonlySet<string>
}

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
  /** Following the document, which has not been read yet, as in the server render and hydration. */
  expandedPending: boolean
}

export type NavigatorBar = {
  navCollapsed: boolean
  tabBar: PaneTabBar
  // Holds the bar open after tapping the collapsed active circle, until the next scroll down.
  pinExpanded: boolean
}

const noop = () => {}

export const NavigatorActionsContext = createContext<NavigatorActions>({
  setValue: noop,
  setNavCollapsed: noop,
  setTabBar: noop,
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
  setOpenMenu: noop,
  declareSecondaryPane: () => noop,
  setExpanded: noop,
  expandedFromDocument: false,
  primaryId: ''
})
NavigatorActionsContext.displayName = 'NavigatorActionsContext'

export const NavigatorSelectionContext = createContext<NavigatorSelection>({
  value: undefined,
  collected: collectSlots(null),

  activeSecondary: null,
  listPaneShows: false,
  showList: false,
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
  tabBar: 'auto',
  pinExpanded: false
})
NavigatorBarContext.displayName = 'NavigatorBarContext'

export const isActiveValue = (
  itemValue: string,
  activeValue: string | undefined
) => itemValue === activeValue

// Prefix matching keeps a destination lit on sub-routes its tree never declares.
export const isBranchActive = (
  itemValue: string,
  descendantValues: string[],
  activeValue: string | undefined
) =>
  isActiveValue(itemValue, activeValue) ||
  descendantValues.some((value) => isActiveValue(value, activeValue)) ||
  (activeValue !== undefined && activeValue.startsWith(`${itemValue}/`))

// A menu item owns a menu, not a destination, so no route may light it.
export const isDestinationActive = (
  item: Pick<NavigatorSlotMeta, 'value' | 'descendants' | 'menu'>,
  activeValue: string | undefined
) => !item.menu && isBranchActive(item.value, item.descendants, activeValue)
