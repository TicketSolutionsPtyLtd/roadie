'use client'

import { pauseLiveExamples, scrollParentOf } from './nearViewport'

const QUIET_MS = 150
const MAX_SCROLL_MS = 3000
const SETTLE_MS = 1500
const MAX_CORRECTIONS = 10
const USER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const

/** Distance from where `block: 'start'` puts the element: its scroller's top, past scroll-padding and scroll-margin. */
function offsetOf(element: Element, scroller: Element | null) {
  const box = scroller ?? document.documentElement
  const padding = parseFloat(getComputedStyle(box).scrollPaddingTop) || 0
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0
  const top = scroller ? scroller.getBoundingClientRect().top : 0
  return element.getBoundingClientRect().top - top - padding - margin
}

// Safari has no scrollend, so a quiet spell after the last scroll event stands in.
function whenScrollEnds(target: EventTarget, onEnd: () => void) {
  let quiet = setTimeout(end, QUIET_MS)
  const cap = setTimeout(end, MAX_SCROLL_MS)
  function onScroll() {
    clearTimeout(quiet)
    quiet = setTimeout(end, QUIET_MS)
  }
  function end() {
    clearTimeout(quiet)
    clearTimeout(cap)
    target.removeEventListener('scroll', onScroll)
    target.removeEventListener('scrollend', end)
    onEnd()
  }
  target.addEventListener('scroll', onScroll, { passive: true })
  target.addEventListener('scrollend', end)
}

/**
 * Scrolls an element to the top of its scroller and keeps it there while the
 * live examples around it mount. Examples it passes on the way stay
 * unrendered; the ones in reach where it lands mount after, and any height
 * they add above is scrolled back out, which Safari's missing scroll
 * anchoring would otherwise leave. Any user input hands control back.
 */
export function landOn(element: Element, smooth: boolean) {
  const scroller = scrollParentOf(element)
  const scrollTarget: EventTarget = scroller ?? window
  const resume = pauseLiveExamples()
  let stopped = false
  let frame = 0

  function stop() {
    stopped = true
    cancelAnimationFrame(frame)
    resume()
    for (const type of USER_INPUT)
      window.removeEventListener(type, stop, { capture: true })
  }
  for (const type of USER_INPUT)
    window.addEventListener(type, stop, { capture: true, passive: true })

  element.scrollIntoView({
    behavior: smooth ? 'smooth' : 'instant',
    block: 'start'
  })

  whenScrollEnds(scrollTarget, () => {
    if (stopped) return
    resume()
    const until = performance.now() + SETTLE_MS
    let corrections = 0
    const settle = () => {
      if (stopped) return
      if (performance.now() > until) return stop()
      const before = offsetOf(element, scroller)
      if (Math.abs(before) > 2 && corrections < MAX_CORRECTIONS) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' })
        // At the end of the page the element can't reach the top; stop trying.
        if (Math.abs(offsetOf(element, scroller) - before) < 1) return stop()
        corrections++
      }
      frame = requestAnimationFrame(settle)
    }
    settle()
  })
}
