'use client'

import { createContext } from 'react'

// Pane defines this seam and never fills it, so Navigator -> Pane stays one-way.
export type PaneChromeContextValue = {
  /** How far the pane scrolls, in px, before it reports `onScrollPast(true)`. */
  scrollPastAt?: number
  /** The viewport crossed `scrollPastAt`: true once scrolled beyond it, false back within it. */
  onScrollPast?: (past: boolean) => void
  /** Wanted only while the orchestrator needs direction: called on each frame that scrolled down. */
  onScrollDown?: () => void
  /** An orchestrator's Back link — the parent route. The header's own `backHref` and `onBack` still win. */
  backHref?: string
  /** The parent's title, naming that link "Back to {label}". */
  backLabel?: string
}

// Also what a covered pane gets, so it cannot write shared nav state.
export const PANE_CHROME_NONE: PaneChromeContextValue = {}

export const PaneChromeContext = createContext(PANE_CHROME_NONE)
PaneChromeContext.displayName = 'PaneChromeContext'
