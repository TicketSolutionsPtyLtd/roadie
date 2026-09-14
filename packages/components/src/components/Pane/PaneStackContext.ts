'use client'

import { createContext } from 'react'

import type { PaneChromeContextValue } from './PaneChromeContext'
import type { PaneDepth } from './paneColumns'
import type { PanePrimaryNav, PaneRole } from './variants'

export type PaneStackPosition = 'top' | 'ahead' | 'behind'

// Orchestrator bookkeeping only: which panes the orchestrator generated or owns.
export type PaneKind =
  'pane' | 'section' | 'generated-section' | 'overflow' | 'generated-overflow'

export type PaneRegistration = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
  kind: PaneKind
  depth?: PaneDepth
}

export type PaneStackContextValue = {
  register: (id: string, node: HTMLElement, entry: PaneRegistration) => void
  unregister: (id: string) => void
  /** `entry` places a pane that has not registered yet, as in the server render. */
  positionOf: (id: string, entry: PaneRegistration) => PaneStackPosition | null
  chromeOf: (id: string, entry: PaneRegistration) => PaneChromeContextValue
  /** Is this the base of the stack — the one pane a Close would never suit. */
  isRootOf: (id: string) => boolean
  /** Resolved from document order once registered; declared or role default before. `null` for an inspector. */
  depthOf: (id: string, entry: PaneRegistration) => number | null
  /** 0 for the outermost `Navigator.Content`. */
  level: number
}

// Registration, not an element-identity walk: an orchestrator cannot see
// through a wrapper it did not render — a Next.js parallel-route slot node
// most of all — so panes announce themselves instead of being found. `Pane`
// defines this and fills nothing; `Navigator.Content` provides it. That keeps
// `Pane` usable with no `Navigator` anywhere and the dependency one-way.
export const PaneStackContext = createContext<PaneStackContextValue | null>(
  null
)
PaneStackContext.displayName = 'PaneStackContext'

export const PaneKindContext = createContext<PaneKind>('pane')
PaneKindContext.displayName = 'PaneKindContext'
