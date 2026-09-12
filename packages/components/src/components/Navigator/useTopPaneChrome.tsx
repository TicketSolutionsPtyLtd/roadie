'use client'

import { use, useCallback, useMemo, useRef } from 'react'

import type { PaneChromeContextValue } from '../Pane/PaneChromeContext'
import { NavigatorContext } from './NavigatorContext'

// Large enough that overscroll rubber-banding at the top doesn't flicker the bar.
export const NAV_COLLAPSE_THRESHOLD = 24

/** What the orchestrator hands the top pane of the stack. */
export function useTopPaneChrome({
  atRoot
}: {
  atRoot: boolean
}): PaneChromeContextValue {
  const {
    navCollapsed,
    setNavCollapsed,
    pinExpanded,
    setPinExpanded,
    registerActivePaneScroller,
    activeSection,
    overflowOpen
  } = use(NavigatorContext)
  const prevScrollTop = useRef(0)

  const onViewportScroll = useCallback(
    (scrollTop: number) => {
      const scrolledDown = scrollTop > prevScrollTop.current
      prevScrollTop.current = scrollTop

      // The pin holds the bar open until the next scroll down, or the top.
      const clearsPin =
        pinExpanded && (scrolledDown || scrollTop <= NAV_COLLAPSE_THRESHOLD)
      if (clearsPin) setPinExpanded(false)

      // A cleared pin applies to this scroll, not the next.
      const pinned = pinExpanded && !clearsPin

      const next = scrollTop > NAV_COLLAPSE_THRESHOLD && !pinned
      if (next !== navCollapsed) setNavCollapsed(next)
    },
    [navCollapsed, pinExpanded, setNavCollapsed, setPinExpanded]
  )

  const backHref =
    activeSection?.href !== undefined && !overflowOpen && !atRoot
      ? activeSection.href
      : undefined

  return useMemo(
    () => ({
      onViewportScroll,
      registerScroller: registerActivePaneScroller,
      backHref
    }),
    [onViewportScroll, registerActivePaneScroller, backHref]
  )
}
