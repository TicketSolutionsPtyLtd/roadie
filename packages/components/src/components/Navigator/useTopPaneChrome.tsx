'use client'

import { use, useCallback, useMemo, useRef } from 'react'

import type { PaneChromeContextValue } from '../Pane/PaneChromeContext'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorPaneChrome } from './NavigatorPaneChrome'

// Small enough that a nudge collapses the bar, large enough that overscroll
// rubber-banding at the top doesn't flicker it.
export const NAV_COLLAPSE_THRESHOLD = 24

// One element for the life of the module: the chrome value is rebuilt whenever
// bar state changes, and a fresh element here would remount the strip — and
// with it the indicator's measurements — on every scroll frame.
const stripElement = <NavigatorPaneChrome />

/**
 * What the orchestrator hands the top pane of the stack.
 *
 * Policy only. The pane owns the mechanism — its viewport, its frame
 * coalescing, its scrolling — and reports a raw scroll position; what that
 * position means for the mobile bar, and what the manual-expand pin does to
 * that meaning, is Navigator's business alone.
 */
export function useTopPaneChrome(): PaneChromeContextValue {
  const {
    navCollapsed,
    setNavCollapsed,
    pinExpanded,
    setPinExpanded,
    setActivePaneScroller,
    secondaryNav
  } = use(NavigatorContext)
  const prevScrollTop = useRef(0)

  const onViewportScroll = useCallback(
    (scrollTop: number) => {
      const scrolledDown = scrollTop > prevScrollTop.current
      prevScrollTop.current = scrollTop

      // The pin holds the bar open while the pane is still scrolled. It clears
      // the moment the user scrolls down again (iOS re-collapse) or reaches the
      // top.
      const clearsPin =
        pinExpanded && (scrolledDown || scrollTop <= NAV_COLLAPSE_THRESHOLD)
      if (clearsPin) setPinExpanded(false)

      // The cleared pin has to apply to this scroll, not the next one: reading
      // `pinExpanded` again here would still see the pre-clear value and leave
      // the bar open for one more scroll event after the user had already
      // scrolled down.
      const pinned = pinExpanded && !clearsPin

      // Compared against live context state, not a private ref, so sibling
      // panes stay in sync while redundant renders are still skipped.
      const next = scrollTop > NAV_COLLAPSE_THRESHOLD && !pinned
      if (next !== navCollapsed) setNavCollapsed(next)
    },
    [navCollapsed, pinExpanded, setNavCollapsed, setPinExpanded]
  )

  // Null rather than an element that renders nothing: `Pane.Header` decides
  // whether it has anything to draw by looking at this value, so an element
  // standing in for "no chrome" would leave it drawing an empty sticky bar.
  return useMemo(
    () => ({
      headerExtras: secondaryNav === null ? null : stripElement,
      onViewportScroll,
      registerScroller: setActivePaneScroller
    }),
    [secondaryNav, onViewportScroll, setActivePaneScroller]
  )
}
