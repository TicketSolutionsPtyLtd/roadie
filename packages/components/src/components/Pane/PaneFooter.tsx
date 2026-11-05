'use client'

import { type ComponentProps, useLayoutEffect, useMemo, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { paneFooterClass } from './variants'

export type PaneFooterProps = ComponentProps<'div'>

// A pane can hold more than one footer, so it clears their sum, and losing one
// leaves the others' heights in place.
const footerHeights = new WeakMap<HTMLElement, Map<HTMLElement, number>>()

function publishFooters(paneEl: HTMLElement) {
  const heights = footerHeights.get(paneEl)
  if (!heights?.size) {
    paneEl.style.removeProperty('--pane-footer-height')
    return
  }
  const total = [...heights.values()].reduce((sum, height) => sum + height, 0)
  paneEl.style.setProperty('--pane-footer-height', `${total}px`)
}

/** Sticky chrome at the foot of a pane. */
export function PaneFooter({ className, ref, ...props }: PaneFooterProps) {
  const footerRef = useRef<HTMLDivElement>(null)
  const setRef = useMemo(() => mergeRefs(footerRef, ref), [ref])

  // Published for sticky content that has to clear it, as the header publishes its own.
  useLayoutEffect(() => {
    const footer = footerRef.current
    const paneEl = footer?.closest<HTMLElement>(
      '[data-slot="pane"], [data-slot="drawer-popup"]'
    )
    if (!footer || !paneEl) return
    let heights = footerHeights.get(paneEl)
    if (!heights) footerHeights.set(paneEl, (heights = new Map()))
    const footers = heights
    const publish = () => {
      footers.set(footer, footer.offsetHeight)
      publishFooters(paneEl)
    }
    publish()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    observer?.observe(footer)
    return () => {
      observer?.disconnect()
      footers.delete(footer)
      publishFooters(paneEl)
    }
  }, [])

  return (
    <div
      ref={setRef}
      data-slot='pane-footer'
      className={cn(paneFooterClass, className)}
      {...props}
    />
  )
}

PaneFooter.displayName = 'Pane.Footer'
