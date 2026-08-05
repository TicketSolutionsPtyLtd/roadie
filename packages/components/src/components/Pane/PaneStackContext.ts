'use client'

import { createContext } from 'react'

import type { PaneChromeContextValue } from './PaneChromeContext'
import type { PanePresentation, PanePrimaryNav, PaneRole } from './variants'

export type PaneStackPosition = 'top' | 'ahead' | 'behind'

// A pane's own opinion of what kind of pane it is, for the orchestrator's
// bookkeeping only — distinct from `role`, which is content-facing and drives
// layout. Every pane defaults to `'pane'`; `Navigator.Overflow` is the only
// thing that ever fills this, with two different values depending on whether
// it's rendering a consumer's own declaration or `Navigator.Content`'s
// generated fallback for the same slot. That distinction is what lets the
// fallback tell a real declaration apart from itself: both render the
// identical component and carry the same DOM id, so nothing about their own
// registration would otherwise say which is which.
export type PaneKind = 'pane' | 'overflow' | 'generated-overflow'

export type PaneRegistration = {
  role: PaneRole
  current: boolean
  presentation: PanePresentation
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
