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

const PAINTS = /^background|surface|intent|bg|colou?r|hue|theme/
// What a scroll area, pane, or accordion writes as it moves: a length can't be a fill behind var().
const LENGTH = /^(-?[\d.]+(px)?)?$/

function paints(name: string, before: string, after: string) {
  if (before === after) return false
  if (PAINTS.test(name)) return true
  return name.startsWith('--') && !(LENGTH.test(before) && LENGTH.test(after))
}

let parsed: CSSStyleDeclaration | undefined

// A scroll area writes its overflow to its own style on every scroll, and
// settling reads computed style, so only a declaration that could paint
// differently is a reason to settle.
function repaints(record: MutationRecord) {
  if (record.attributeName !== 'style') return true
  parsed ??= document.createElement('div').style
  parsed.cssText = record.oldValue ?? ''
  const now = (record.target as HTMLElement).style
  // A shorthand holding var() leaves its longhands blank, so it's read whole.
  for (const name of new Set(['background', ...parsed, ...now]))
    if (paints(name, parsed.getPropertyValue(name), now.getPropertyValue(name)))
      return true
  return false
}

/** Settles now and again whenever the theme or a surface behind it changes. */
function watchSurface(part: HTMLElement) {
  settle(part)
  const observer = new MutationObserver((records) => {
    if (records.some(repaints)) settle(part)
  })
  // Only the chain above the part, so changes elsewhere on the page cost nothing.
  for (let node = part.parentElement; node; node = node.parentElement)
    observer.observe(node, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class', 'data-theme', 'style']
    })
  return () => observer.disconnect()
}

/**
 * The opaque colour sticky parts paint. `--records-surface` keeps its name
 * because consumers may set it.
 */
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
