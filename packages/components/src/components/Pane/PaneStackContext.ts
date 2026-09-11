'use client'

import { createContext } from 'react'

import type { PaneChromeContextValue } from './PaneChromeContext'
import type { PanePrimaryNav, PaneRole } from './variants'

export type PaneStackPosition = 'top' | 'ahead' | 'behind'

// Orchestrator bookkeeping only: which panes the orchestrator generated or owns.
export type PaneKind = 'pane' | 'section' | 'overflow' | 'generated-overflow'

export type PaneRegistration = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
  kind: PaneKind
}

export type PaneStackContextValue = {
  register: (id: string, node: HTMLElement, entry: PaneRegistration) => void
  unregister: (id: string) => void
  positionOf: (id: string) => PaneStackPosition | null
  chromeOf: (id: string) => PaneChromeContextValue
  /** Is this the base of the stack — the one pane a Close would never suit. */
  isRootOf: (id: string) => boolean
}

// Registration, not an element-identity walk: an orchestrator cannot see
// through a wrapper it did not render — a Next.js parallel-route slot node
// most of all — so panes announce themselves instead of being found. `Pane`
// defines this and fills nothing; `Navigator.Content` provides it. That keeps
// `Pane` usable with no `Navigator` anywhere and the dependency one-way.
export const PaneStackContext = createContext<PaneStackContextValue | null>(
  null
)

export const PaneKindContext = createContext<PaneKind>('pane')
