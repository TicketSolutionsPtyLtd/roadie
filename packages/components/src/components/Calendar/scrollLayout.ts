import { type RefObject, useEffect, useRef } from 'react'

import { addMonths, compareDates } from '@oztix/roadie-core/datetime'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import type { MonthRun, viewModel } from './view'

/** What tells a scrolling calendar the reader has taken over its scroll. */
const TAKE_OVER = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const
/** Months a scrolling calendar adds as it nears an end. */
// A few at a time: a dozen at once lays out ~500 days in one frame and drops
// frames on a phone, and the scroll is kept steady when months join above.
const SCROLL_STEP = 4

/** The box the months scroll in. Sideways scrolling alone makes `overflow-y` auto too, so it must also be taller inside than out. */
function scrollingAncestor(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (
      /auto|scroll/.test(getComputedStyle(el).overflowY) &&
      el.scrollHeight > el.clientHeight
    )
      return el
  }
  return null
}

type ScrollLayoutOptions = {
  /** A scrolling calendar that knows its months, so has laid them out. */
  active: boolean
  page: ReturnType<typeof viewModel>
  run: MonthRun | null
  setRun: (run: MonthRun) => void
  /** Moves the first month, as a turn would. */
  changeMonth: (month: string) => void
  onMonthChange?: (month: string) => void
}

/**
 * Lays out a scrolling calendar in the box it scrolls in: brings the first
 * month under the pinned weekdays, reports the month at the top as the
 * reader scrolls, and adds months as either end nears.
 */
export function useScrollLayout(
  rootRef: RefObject<HTMLDivElement | null>,
  weekdaysRef: RefObject<HTMLDivElement | null>,
  { active, page, run, setRun, changeMonth, onMonthChange }: ScrollLayoutOptions
) {
  const { firstMonth, months, visibleStart, currentRun, clampMonth } = page
  const { extendedRun, firstAllowedMonth, lastAllowedMonth } = page
  // Brings the first month to the top of the list, under the weekdays, when
  // it opens and whenever the first month changes.
  // Scrolls only for a new first month, never back to one the parent
  // keeps, and not for the one the list reported as it scrolled.
  const scrolledTo = useRef<string | null>(null)
  const reported = useRef<string | null>(null)
  const settling = useRef<(() => void) | null>(null)
  useIsomorphicLayoutEffect(() => {
    if (!active || scrolledTo.current === firstMonth) return
    if (reported.current === firstMonth) {
      scrolledTo.current = firstMonth
      return
    }
    const root = rootRef.current
    const month = root?.querySelector(`[data-month="${firstMonth}"]`)
    const scroller = root && scrollingAncestor(root)
    // Hidden or not laid out yet, so try again on a later render.
    if (!month || !scroller || scroller.clientHeight === 0) return
    scrolledTo.current = firstMonth
    // A month reported before this one is no longer where the list rests.
    reported.current = null
    const target = firstMonth
    const align = () => {
      const weekdays = weekdaysRef.current
      const month = rootRef.current?.querySelector(`[data-month="${target}"]`)
      if (!weekdays || !month) return
      const stuckAt =
        scroller.getBoundingClientRect().top +
        weekdays.getBoundingClientRect().height +
        (parseFloat(getComputedStyle(weekdays).top) || 0)
      const by = month.getBoundingClientRect().top - stuckAt
      if (Math.abs(by) >= 1) scroller.scrollBy({ top: by, behavior: 'instant' })
      aligned = scroller.scrollTop
    }
    let aligned = scroller.scrollTop
    align()
    // Content around the list can still move as it opens, such as a tab
    // panel on its way out, so it stays aligned until the reader takes over.
    settling.current?.()
    if (typeof ResizeObserver === 'undefined') return
    // Next frame, as scrolling inside the observer's callback loops it.
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(align)
    })
    observer.observe(scroller.firstElementChild ?? root)
    // A scroll that isn't its own is the reader's, or the page's.
    const onScroll = () => {
      if (Math.abs(scroller.scrollTop - aligned) > 1) stop()
    }
    const stop = () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      for (const type of TAKE_OVER) scroller.removeEventListener(type, stop)
      scroller.removeEventListener('scroll', onScroll)
      settling.current = null
    }
    const timer = setTimeout(stop, 1000)
    for (const type of TAKE_OVER)
      scroller.addEventListener(type, stop, { passive: true })
    scroller.addEventListener('scroll', onScroll, { passive: true })
    settling.current = stop
  })
  // Only once it has really gone: a development remount keeps the same DOM.
  useEffect(
    () => () =>
      queueMicrotask(() => {
        if (!rootRef.current?.isConnected) settling.current?.()
      }),
    [rootRef]
  )

  // Months added above would push what is in view down; the scroll moves
  // with them. Engines that anchor scrolling themselves leave nothing to do.
  const keptInView = useRef<{ month: string; top: number } | null>(null)
  useIsomorphicLayoutEffect(() => {
    const kept = keptInView.current
    if (!kept) return
    keptInView.current = null
    const root = rootRef.current
    const month = root?.querySelector(`[data-month="${kept.month}"]`)
    const scroller = root && scrollingAncestor(root)
    if (!month || !scroller) return
    scroller.scrollBy({
      top: month.getBoundingClientRect().top - kept.top,
      behavior: 'instant'
    })
  })

  // The month at the top of a scrolled list is the first month, so a parent
  // that moves `month` somewhere already in view still scrolls to it.
  const followTop = () => {
    // Its own aligning isn't the reader scrolling.
    if (settling.current) return
    const root = rootRef.current
    const scroller = root && scrollingAncestor(root)
    const weekdays = weekdaysRef.current
    if (!root || !scroller || !weekdays) return
    const below = weekdays.getBoundingClientRect().bottom
    const top = Array.from(
      root.querySelectorAll<HTMLElement>('[data-slot="calendar-month"]')
    ).find((month) => month.getBoundingClientRect().bottom > below + 1)
    const month = top?.dataset.month
    // Back at the month a parent still holds, after reporting another it
    // hasn't taken up yet.
    const back =
      month === firstMonth && !!reported.current && reported.current !== month
    if (!month || (month === firstMonth && !back)) return
    reported.current = month
    // Held, so the run doesn't recentre on the month scrolled to.
    if (run !== currentRun) setRun(currentRun)
    if (back) onMonthChange?.(month)
    else changeMonth(month)
  }
  const followTopRef = useRef(followTop)
  useIsomorphicLayoutEffect(() => {
    followTopRef.current = followTop
  })
  useEffect(() => {
    if (!active) return
    const scroller = rootRef.current && scrollingAncestor(rootRef.current)
    if (!scroller) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => followTopRef.current())
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [rootRef, active, months.length])

  const earlierRef = useRef<HTMLDivElement>(null)
  const laterRef = useRef<HTMLDivElement>(null)
  const canAddEarlier =
    !firstAllowedMonth || compareDates(visibleStart, firstAllowedMonth) > 0
  const canAddLater =
    !lastAllowedMonth ||
    compareDates(months[months.length - 1]!, lastAllowedMonth) < 0
  const growRun = (earlier: boolean) => {
    if (earlier) {
      const month = rootRef.current?.querySelector(
        `[data-month="${visibleStart}"]`
      )
      if (month)
        keptInView.current = {
          month: visibleStart,
          top: month.getBoundingClientRect().top
        }
      setRun(extendedRun(clampMonth(addMonths(visibleStart, -SCROLL_STEP))))
    } else {
      setRun(
        extendedRun(
          clampMonth(addMonths(months[months.length - 1]!, SCROLL_STEP))
        )
      )
    }
  }
  const grownAt = useRef<number | null>(null)
  const growRunRef = useRef(growRun)
  useIsomorphicLayoutEffect(() => {
    growRunRef.current = growRun
  })
  useEffect(() => {
    if (!active) return
    if (typeof IntersectionObserver === 'undefined') return
    const root = rootRef.current && scrollingAncestor(rootRef.current)
    const scrolled = () => (root ? root.scrollTop : window.scrollY)
    const observer = new IntersectionObserver(
      (entries) => {
        // With no box of its own to scroll, months added above would push
        // the page down, so the list only grows below.
        const near = entries.find(
          (entry) =>
            entry.isIntersecting &&
            (root || entry.target !== earlierRef.current)
        )
        // Only after a scroll: a new observer reports an end still in reach,
        // and growing for that alone would never stop.
        if (!near || grownAt.current === scrolled()) return
        grownAt.current = scrolled()
        growRunRef.current(near.target === earlierRef.current)
      },
      { root, rootMargin: '400px 0px' }
    )
    if (canAddEarlier && earlierRef.current)
      observer.observe(earlierRef.current)
    if (canAddLater && laterRef.current) observer.observe(laterRef.current)
    return () => observer.disconnect()
  }, [rootRef, active, canAddEarlier, canAddLater, visibleStart, months.length])

  return { earlierRef, laterRef, canAddEarlier, canAddLater }
}
