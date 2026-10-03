'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

import { findStickyContainer } from './scrollParent'

const PANE_HEADER = 'var(--pane-header-height, 0px)'
const TOOLBAR = 'var(--records-toolbar-height, 0px)'

const sum = (parts: string[]) =>
  parts.length === 0
    ? '0px'
    : parts.length === 1
      ? parts[0]!
      : `calc(${parts.join(' + ')})`

/**
 * The `top` for a sticky part: under a pane's header only when the pane
 * scrolls it, and under the toolbar only when both stick in the same box.
 */
export function useStickyTop(
  ref: RefObject<HTMLElement | null>,
  { underToolbar }: { underToolbar: boolean }
) {
  const [top, setTop] = useState(PANE_HEADER)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const container = findStickyContainer(element)
    const toolbar = underToolbar
      ? element
          .closest('[data-slot="records"]')
          ?.querySelector<HTMLElement>('[data-slot="records-toolbar"]')
      : null
    const parts: string[] = []
    if (container?.dataset.slot === 'pane-viewport') parts.push(PANE_HEADER)
    if (toolbar && findStickyContainer(toolbar) === container)
      parts.push(TOOLBAR)
    setTop(sum(parts))
  }, [ref, underToolbar])
  return top
}
