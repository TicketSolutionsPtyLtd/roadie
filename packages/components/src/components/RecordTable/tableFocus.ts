'use client'

import { type RefObject, useLayoutEffect } from 'react'

/** The table's named region: its box when it scrolls in one, else its sideways scroller. */
export function tableFocusTarget(from: Element) {
  return (
    from.closest<HTMLElement>('[data-slot="record-table-viewport"]') ??
    from.closest<HTMLElement>('[data-slot="record-table-scroller"]')
  )
}

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
      tableFocusTarget(element)?.focus({ preventScroll: true })
    }
  }, [ref])
}
