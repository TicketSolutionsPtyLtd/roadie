'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

const PANE_CONTENT =
  '[data-slot=pane-viewport] > [data-slot=scroll-area-content]'

function contentEdges(element: HTMLElement) {
  const box = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  return {
    left:
      box.left +
      parseFloat(style.borderLeftWidth) +
      parseFloat(style.paddingLeft),
    right:
      box.right -
      parseFloat(style.borderRightWidth) -
      parseFloat(style.paddingRight)
  }
}

/**
 * Whether a table too wide for a pane's content box should reach the pane's
 * edges: only when its parent spans that box, so a card or a measure inside
 * the pane keeps it.
 */
export function usePaneBleed(
  ref: RefObject<HTMLElement | null>,
  /** The table's narrowest width, in rem. */
  minWidth: number,
  enabled: boolean
) {
  const [bleeds, setBleeds] = useState(false)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    const content = parent?.closest<HTMLElement>(PANE_CONTENT)
    if (!enabled || !parent || !content) {
      setBleeds(false)
      return
    }
    const update = () => {
      const inner = contentEdges(parent)
      const pane = contentEdges(content)
      const spans =
        Math.abs(inner.left - pane.left) < 1 &&
        Math.abs(inner.right - pane.right) < 1
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      setBleeds(spans && minWidth * rem > inner.right - inner.left)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [ref, minWidth, enabled])
  return bleeds
}
