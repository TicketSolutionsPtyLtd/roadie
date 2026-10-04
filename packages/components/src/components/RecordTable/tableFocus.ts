'use client'

import { type RefObject, useLayoutEffect } from 'react'

/** The records' named region: their box when they scroll in one, else their scroller, in a table or a grid. */
export function tableFocusTarget(from: Element) {
  return (
    from.closest<HTMLElement>(
      '[data-slot="record-table-viewport"], [data-slot="record-grid-viewport"]'
    ) ?? from.closest<HTMLElement>(RECORDS_SCROLLER)
  )
}

/** Where a layout's records scroll from, a table's or a grid's. */
export const RECORDS_SCROLLER =
  '[data-slot="record-table-scroller"], [data-slot="record-grid-scroller"]'

/** Table targets taking focus from a row that is leaving, while they take it. */
export const handedOver = new WeakSet<Element>()

/**
 * Hands focus to the table when an element holding it unmounts, such as a
 * row scrolled out of the window, so keyboard users keep their place
 * instead of starting again from the top of the page.
 */
export function useKeepFocusInTable(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current
    return () => {
      if (!element?.contains(document.activeElement)) return
      const target = tableFocusTarget(element)
      if (!target) return
      handedOver.add(target)
      target.focus({ preventScroll: true })
      handedOver.delete(target)
    }
  }, [ref])
}
