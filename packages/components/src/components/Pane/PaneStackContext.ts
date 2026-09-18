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
}

export type PanePlace = {
  position: PaneStackPosition | null
  /** Document order once registered; before that, render order while hydrating, else declared or column default. */
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
  /** Where a pane sits; `entry` places one not yet registered, by render order while `hydrating`. */
  placeOf: (
    id: string,
    entry: PaneRegistration,
    hydrating?: boolean
  ) => PanePlace
  /** Lets the stack slide for the change this commit makes. */
  markPushing: () => void
  /** The top as the committed DOM holds it; `placeOf` learns of an arriving pane a commit late. */
  topNow: () => Element | null
  /** More is open and has a pane to show. */
  moreOpen: boolean
  /** 0 for the outermost Navigator. */
  level: number
  /** The active destination; a new one scrolls every pane not behind the top back to its top. */
  destination?: string
}

// Registration, not an element walk: an orchestrator can't see through slots it didn't render.
export const PaneStackContext = createContext<PaneStackContextValue | null>(
  null
)
PaneStackContext.displayName = 'PaneStackContext'

export const PaneKindContext = createContext<PaneKind>('pane')
PaneKindContext.displayName = 'PaneKindContext'
