'use client'

import { type ReactNode, createContext } from 'react'

export type PaneContextValue = {
  /** 0 is the root of its stack, or a standalone `list`. `null` for an inspector. */
  depth: number | null
  /** The pane is scrolled past the collapse threshold. */
  collapsed: boolean
  /** Scrolls this pane's viewport to the top, honouring reduced motion. */
  scrollToTop: () => void
  /** Nothing to close back to; true outside an orchestrator. */
  isRoot: boolean
  /** A `Pane.BodyTitle`'s text, for the header's echo. */
  bodyTitle: ReactNode | null
  setBodyTitle: (node: ReactNode | null) => void
}

export const PaneContext = createContext<PaneContextValue | null>(null)
PaneContext.displayName = 'PaneContext'
