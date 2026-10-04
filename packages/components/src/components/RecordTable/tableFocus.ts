'use client'

import { type RefObject, useLayoutEffect } from 'react'

/** The table's named region: its box when it scrolls in one, else its sideways scroller. */
export function tableFocusTarget(from: Element) {
  return (
    from.closest<HTMLElement>('[data-slot="record-table-viewport"]') ??
    from.closest<HTMLElement>('[data-slot="record-table-scroller"]')
  )
}

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
