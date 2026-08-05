'use client'

import { type ReactNode, createContext } from 'react'

// Chrome an orchestrator contributes to a pane — the active section's nav
// strip — plus the two seams that run the other way: the pane reports where it
// is scrolled, and hands back a way to scroll it.
//
// `Pane` defines it and renders whatever it holds; it never fills it. That
// one-way dependency is what lets `Pane` work with no `Navigator` present, and
// it keeps `Navigator -> Pane` a single direction with no module cycle.
export type PaneChromeContextValue = {
  /** Header body, below the top row — the section nav strip belongs here. */
  headerExtras: ReactNode
  onViewportScroll: (scrollTop: number) => void
  registerScroller: (scroller: (() => void) | null) => void
}

// Also what an orchestrator hands every pane that is not the top of the stack.
// An inert reporter is the top-pane gate expressed as data, so a covered pane
// cannot write shared nav state — no DOM walk, no breakpoint reading.
export const PANE_CHROME_NONE: PaneChromeContextValue = {
  headerExtras: null,
  onViewportScroll: () => {},
  registerScroller: () => {}
}

export const PaneChromeContext = createContext(PANE_CHROME_NONE)
