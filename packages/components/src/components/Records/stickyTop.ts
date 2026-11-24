'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

import { findStickyContainer } from './scrollParent'

const PANE_HEADER = 'var(--pane-header-height, 0px)'
/**
 * One property per set of records, named by its scope: two sets can publish
 * to one box, such as two Providers in a pane, and neither takes or clears
 * the other's height.
 */
const toolbarHeight = (scope: string) =>
  `--records-toolbar-height-${scope.replace(/[^\w-]/g, '')}`

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
  toolbar: HTMLElement | null,
  /** The records' scope, which names the toolbar's height. */
  scope: string,
  /** Changes when the part may have moved to another scroll box. */
  placement?: unknown
) {
  const [top, setTop] = useState(PANE_HEADER)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const container = findStickyContainer(element)
    const parts: string[] = []
    if (container?.dataset.slot === 'pane-viewport') parts.push(PANE_HEADER)
    if (toolbar && findStickyContainer(toolbar) === container)
      parts.push(`var(${toolbarHeight(scope)}, 0px)`)
    setTop(sum(parts))
  }, [ref, toolbar, scope, placement])
  return top
}

/**
 * Publishes the toolbar's height as a custom property while it is
 * the one `toolbar` names, written straight to the style so a resize renders
 * nothing. It goes on the Records root, or without one on the box the toolbar
 * sticks in, which holds every part that sticks under it.
 */
export function usePublishToolbarHeight(
  ref: RefObject<HTMLElement | null>,
  toolbar: HTMLElement | null,
  scope: string
) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || element !== toolbar) return
    const property = toolbarHeight(scope)
    const target =
      element.closest<HTMLElement>('[data-slot="records"]') ??
      findStickyContainer(element) ??
      document.documentElement
    const measure = () =>
      target.style.setProperty(property, `${element.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element, { box: 'border-box' })
    return () => {
      observer.disconnect()
      target.style.removeProperty(property)
    }
  }, [ref, toolbar, scope])
}
