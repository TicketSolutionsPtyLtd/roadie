'use client'

import { createContext } from 'react'

import type { PaneChromeContextValue } from './PaneChromeContext'
import type { PaneDepth } from './paneDepth'
import type { PanePrimaryNav, PaneRole } from './variants'

export type PaneStackPosition = 'top' | 'ahead' | 'behind'

export type PaneKind =
  'pane' | 'section' | 'generated-section' | 'overflow' | 'generated-overflow'

export const isOverflowKind = (kind: PaneKind) =>
  kind === 'overflow' || kind === 'generated-overflow'

export const isSectionKind = (kind: PaneKind) =>
  kind === 'section' || kind === 'generated-section'

export type PaneRegistration = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
  kind: PaneKind
  depth?: PaneDepth
}

export type PanePlace = {
  position: PaneStackPosition | null
  /** Resolved from document order once registered; declared or role default before. `null` for an inspector. */
  depth: number | null
  chrome: PaneChromeContextValue
  /** The base of the stack, where Close never shows. */
  isRoot: boolean
}

export type PaneStackContextValue = {
  register: (id: string, node: HTMLElement, entry: PaneRegistration) => void
  unregister: (id: string) => void
  /** Where a pane sits; `entry` places one that has not registered yet, as in the server render. */
  placeOf: (id: string, entry: PaneRegistration) => PanePlace
  /** Lets the stack slide for the change this commit makes. */
  markPushing: () => void
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
