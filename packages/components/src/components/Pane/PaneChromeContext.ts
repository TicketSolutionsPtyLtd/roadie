'use client'

import { createContext } from 'react'

// Pane defines this seam and never fills it, so Navigator -> Pane stays one-way.
export type PaneChromeContextValue = {
  onViewportScroll: (scrollTop: number) => void
  registerScroller: (scroller: (() => void) | null) => void
  /** An orchestrator's Back link — the section route above a sub-page. The header's own `backHref` and `onBack` still win. */
  backHref?: string
}

// Also what a covered pane gets, so it cannot write shared nav state.
export const PANE_CHROME_NONE: PaneChromeContextValue = {
  onViewportScroll: () => {},
  registerScroller: () => {}
}

export const PaneChromeContext = createContext(PANE_CHROME_NONE)
