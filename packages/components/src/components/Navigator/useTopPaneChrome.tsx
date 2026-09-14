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
  const { navCollapsed, pinExpanded } = use(NavigatorBarContext)
  const { activeSection } = use(NavigatorSelectionContext)
  const { overflowOpen } = use(NavigatorDisclosureContext)
  const prevScrollTop = useRef(0)
  // Read at scroll time, so the chrome keeps one identity while the bar toggles.
  const bar = useRef({ navCollapsed, pinExpanded })
  useIsomorphicLayoutEffect(() => {
    bar.current = { navCollapsed, pinExpanded }
  })

  const onViewportScroll = (scrollTop: number) => {
    const scrolledDown = scrollTop > prevScrollTop.current
    prevScrollTop.current = scrollTop
    const { navCollapsed, pinExpanded } = bar.current

    // The pin holds the bar open until the next scroll down, or the top.
    const clearsPin =
      pinExpanded && (scrolledDown || scrollTop <= NAV_COLLAPSE_THRESHOLD)
    if (clearsPin) setPinExpanded(false)

    // A cleared pin applies to this scroll, not the next.
    const pinned = pinExpanded && !clearsPin

    const next = scrollTop > NAV_COLLAPSE_THRESHOLD && !pinned
    if (next !== navCollapsed) setNavCollapsed(next)
  }

  const backHref =
    activeSection?.href !== undefined && !overflowOpen && !atRoot
      ? activeSection.href
      : undefined

  return {
    onViewportScroll,
    registerScroller: registerActivePaneScroller,
    backHref
  }
}
