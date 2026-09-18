'use client'

import { createContext } from 'react'

import type { PaneChromeContextValue } from './PaneChromeContext'
import type { PaneDepth } from './paneDepth'
import type { PaneColumn, PaneTabBar } from './variants'

export type PaneStackPosition = 'top' | 'ahead' | 'behind'

export type PaneKind =
  | 'pane'
  | 'secondary'
  | 'generated-secondary'
  | 'overflow'
  | 'generated-overflow'

export const isOverflowKind = (kind: PaneKind) =>
  kind === 'overflow' || kind === 'generated-overflow'

export const isSecondaryKind = (kind: PaneKind) =>
  kind === 'secondary' || kind === 'generated-secondary'

export type PaneRegistration = {
  column: PaneColumn
  reached: boolean
  tabBar: PaneTabBar
  kind: PaneKind
  depth?: PaneDepth
  /** A loading pane holds the place of the page that replaces it, so panes rendered after it don't count it. */
  pending?: boolean
}

export type PanePlace = {
  position: PaneStackPosition | null
  /** Resolved from document order once registered; before that, from render order while hydrating, else declared or column default. `null` for an inspector. */
  depth: number | null
  /** The pane has registered, so `depth` is its place in the row. */
  registered: boolean
  chrome: PaneChromeContextValue
  /** The base of the stack, where Close never shows. */
  isRoot: boolean
}

export type PaneStackContextValue = {
  register: (id: string, node: HTMLElement, entry: PaneRegistration) => void
  unregister: (id: string) => void
  /**
   * Where a pane sits; `entry` places one that has not registered yet. While
   * `hydrating` (the server render and the pane's own hydration) it is placed by
   * the order panes render in, which is document order.
   */
  placeOf: (
    id: string,
    entry: PaneRegistration,
    hydrating?: boolean
  ) => PanePlace
  /** Lets the stack slide for the change this commit makes. */
  markPushing: () => void
  /**
   * The top of the stack as the committed DOM holds it, for a layout effect to
   * read. `placeOf` answers from a snapshot that learns of an arriving pane a
   * commit late; this one is already right on the commit the pane arrives in.
   */
  topNow: () => Element | null
  /** More is open and has a pane to show. */
  moreOpen: boolean
  /** 0 for the outermost `Navigator.Content`. */
  level: number
  /** The active destination; a new one scrolls every pane not behind the top back to its top. */
  destination?: string
}

// Registration, not an element walk: an orchestrator can't see through slots it
// didn't render. Pane defines it; Navigator.Content fills it.
export const PaneStackContext = createContext<PaneStackContextValue | null>(
  null
)
PaneStackContext.displayName = 'PaneStackContext'

export const PaneKindContext = createContext<PaneKind>('pane')
PaneKindContext.displayName = 'PaneKindContext'
