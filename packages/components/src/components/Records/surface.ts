'use client'

import { type RefObject, useLayoutEffect } from 'react'

const AUTO = 'data-records-surface'

// A translucent fill would let rows show through a sticky part, so only an
// opaque one counts.
function isOpaque(color: string) {
  const alpha =
    /\/\s*([\d.]+%?)\s*\)$|rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/.exec(color)
  if (!alpha) return color !== 'transparent'
  const value = alpha[1] ?? alpha[2]!
  return value.endsWith('%') ? parseFloat(value) >= 100 : parseFloat(value) >= 1
}

const paintedBehind = (element: HTMLElement) => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor
    if (isOpaque(color)) return color
  }
  return 'var(--intent-bg-normal)'
}

/**
 * A sticky part paints the colour behind it, since `--pane-surface` inherits
 * into cards that paint something else. A surface the consumer sets on or
 * above the records is kept.
 */
function settle(part: HTMLElement) {
  if (part.hasAttribute(AUTO)) part.style.removeProperty('--records-surface')
  if (getComputedStyle(part).getPropertyValue('--records-surface')) {
    part.removeAttribute(AUTO)
    return
  }
  part.setAttribute(AUTO, '')
  part.style.setProperty('--records-surface', paintedBehind(part))
}

/** Settles now and again whenever the theme switches. */
function watchSurface(part: HTMLElement) {
  settle(part)
  const observer = new MutationObserver(() => settle(part))
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style']
  })
  return () => observer.disconnect()
}

/** The opaque colour sticky parts paint. */
export const surfaceClass =
  'bg-(--records-surface,var(--pane-surface,var(--intent-bg-normal)))'

/** Paints a sticky part opaque in the colour behind it. */
export function useSurface(
  ref: RefObject<HTMLElement | null>,
  /** Changes when the part may have remounted. */
  placement?: unknown
) {
  useLayoutEffect(() => {
    if (ref.current) return watchSurface(ref.current)
  }, [ref, placement])
}
