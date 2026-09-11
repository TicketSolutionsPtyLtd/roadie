'use client'

import { createContext } from 'react'

// The seams between a pane and an orchestrator: the pane reports where it is
// scrolled, and hands back a way to scroll it.
//
// `Pane` defines it and renders whatever it holds; it never fills it. That
// one-way dependency is what lets `Pane` work with no `Navigator` present, and
// it keeps `Navigator -> Pane` a single direction with no module cycle.
export type PaneChromeContextValue = {
  onViewportScroll: (scrollTop: number) => void
  registerScroller: (scroller: (() => void) | null) => void
}

// Also what an orchestrator hands every pane that is not the top of the stack.
// An inert reporter is the top-pane gate expressed as data, so a covered pane
// cannot write shared nav state — no DOM walk, no breakpoint reading.
export const PANE_CHROME_NONE: PaneChromeContextValue = {
  onViewportScroll: () => {},
  registerScroller: () => {}
}

export const PaneChromeContext = createContext(PANE_CHROME_NONE)
