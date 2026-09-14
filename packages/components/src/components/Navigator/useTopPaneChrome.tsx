'use client'

import { use, useRef } from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import type { PaneChromeContextValue } from '../Pane/PaneChromeContext'
import {
  NavigatorActionsContext,
  NavigatorBarContext,
  NavigatorDisclosureContext,
  NavigatorSelectionContext
} from './NavigatorContext'

// Large enough that overscroll rubber-banding at the top doesn't flicker the bar.
export const NAV_COLLAPSE_THRESHOLD = 24

/** What the orchestrator hands the top pane of the stack. */
export function useTopPaneChrome({
  atRoot
}: {
  atRoot: boolean
}): PaneChromeContextValue {
  const { setNavCollapsed, setPinExpanded, registerActivePaneScroller } = use(
    NavigatorActionsContext
  )
  const { pinExpanded } = use(NavigatorBarContext)
  const { activeSection } = use(NavigatorSelectionContext)
  const { overflowOpen } = use(NavigatorDisclosureContext)
  // Read at scroll time, so the chrome keeps one identity while the bar toggles.
  const bar = useRef({ pinExpanded, past: false })
  useIsomorphicLayoutEffect(() => {
    bar.current.pinExpanded = pinExpanded
  })

  const onScrollPast = (past: boolean) => {
    bar.current.past = past
    // The pin holds the bar open until the next scroll down, or the top.
    if (!past) {
      if (bar.current.pinExpanded) setPinExpanded(false)
      setNavCollapsed(false)
    } else if (!bar.current.pinExpanded) {
      setNavCollapsed(true)
    }
  }

  const onScrollDown = () => {
    setPinExpanded(false)
    if (bar.current.past) setNavCollapsed(true)
  }

  const backHref =
    activeSection?.href !== undefined && !overflowOpen && !atRoot
      ? activeSection.href
      : undefined

  return {
    scrollPastAt: NAV_COLLAPSE_THRESHOLD,
    onScrollPast,
    // Direction matters only to a pinned bar, so only then does the pane read it.
    onScrollDown: pinExpanded ? onScrollDown : undefined,
    registerScroller: registerActivePaneScroller,
    backHref
  }
}
