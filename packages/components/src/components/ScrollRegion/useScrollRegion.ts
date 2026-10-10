'use client'

import { type RefObject, useEffect } from 'react'

import { trackScrollRegion } from './scrollRegion'

/**
 * Makes the scroll container in `ref` reachable and scrollable with the
 * keyboard while its content overflows sideways: it gets `tabIndex={0}`,
 * `role="region"`, and a name from its table's caption or the heading before
 * it. Nothing changes on the server, so hydration matches.
 */
export function useScrollRegion(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    return trackScrollRegion(scroller)
  }, [ref])
}
