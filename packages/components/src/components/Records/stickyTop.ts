'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

import type { RecordsToolbarBox } from './context'
import { findStickyContainer } from './scrollParent'

const PANE_HEADER = 'var(--pane-header-height, 0px)'

const sum = (parts: string[]) =>
  parts.length === 0
    ? '0px'
    : parts.length === 1
      ? parts[0]!
      : `calc(${parts.join(' + ')})`

/**
 * The `top` for a sticky part: under a pane's header only when the pane
 * scrolls it, and under the toolbar only when both stick in the same box.
 * `inPane` says whether the pane scrolls it.
 */
export function useStickyTop(
  ref: RefObject<HTMLElement | null>,
  toolbar: RecordsToolbarBox | null,
  /** Changes when the part may have moved to another scroll box. */
  placement?: unknown
) {
  const [top, setTop] = useState(PANE_HEADER)
  const [inPane, setInPane] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const container = findStickyContainer(element)
    const parts: string[] = []
    const scrolledByPane = container?.dataset.slot === 'pane-viewport'
    if (scrolledByPane) parts.push(PANE_HEADER)
    if (toolbar && findStickyContainer(toolbar.element) === container)
      parts.push(`${toolbar.height}px`)
    setTop(sum(parts))
    setInPane(scrolledByPane)
  }, [ref, toolbar, placement])
  return { top, inPane }
}
