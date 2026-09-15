'use client'

import { type ReactNode, createContext } from 'react'

// A `null` context means "no surrounding pane", which is why `Pane.Header`
// tests the role explicitly rather than through optional chaining.
export type PaneContextValue = {
  /** 0 is the root of its stack, or a standalone `list`. `null` for an inspector. */
  depth: number | null
  /** The pane is scrolled past the collapse threshold. */
  collapsed: boolean
  /** Scrolls this pane's viewport to the top, honouring reduced motion. */
  scrollToTop: () => void
  /**
   * The base of the stack — there is nothing to close back to. Defaults to
   * `true` outside an orchestrator: an unregistered pane has no position and
   * no root-ness, and showing a Close it cannot honour is worse than none.
   */
  isRoot: boolean
  /**
   * Text of a content-placed `Pane.BodyTitle`, so `Pane.Header` can render
   * its compact echo without the title being one of its own children. Null
   * when the consumer places a `Pane.Title` in the header instead.
   */
  bodyTitle: ReactNode | null
  setBodyTitle: (node: ReactNode | null) => void
}

export const PaneContext = createContext<PaneContextValue | null>(null)
PaneContext.displayName = 'PaneContext'
