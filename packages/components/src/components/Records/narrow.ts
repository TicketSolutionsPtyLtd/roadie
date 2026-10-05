'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

export const NARROW_BELOW = 40

// The room inside, so a toolbar that paints a pane's margins measures its
// controls' room. clientWidth leaves out a scrollbar and ignores transforms.
function contentWidth(element: HTMLElement) {
  const style = getComputedStyle(element)
  return (
    element.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight)
  )
}

/** Whether the element, or its parent with `parent`, has under 40rem of room inside. */
export function useNarrow(
  ref: RefObject<HTMLElement | null>,
  {
    parent = false,
    placement
  }: {
    parent?: boolean
    /** Changes when the element may have been replaced, to observe the new one. */
    placement?: unknown
  } = {}
) {
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const element = parent ? ref.current?.parentElement : ref.current
    if (!element) return
    const limit = () =>
      NARROW_BELOW *
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    // Zero is a box not laid out (hidden, or jsdom), not a narrow one.
    const apply = (width: number) => {
      if (width > 0) setNarrow(width < limit())
    }
    apply(contentWidth(element))
    const observer = new ResizeObserver(() => apply(contentWidth(element)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, parent, placement])
  return narrow
}
