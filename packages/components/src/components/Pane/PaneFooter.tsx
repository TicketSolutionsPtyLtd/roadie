'use client'

import { type ComponentProps, useLayoutEffect, useMemo, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { paneFooterClass } from './variants'

export type PaneFooterProps = ComponentProps<'div'>

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
    const publish = () =>
      paneEl.style.setProperty(
        '--pane-footer-height',
        `${footer.offsetHeight}px`
      )
    publish()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    observer?.observe(footer)
    return () => {
      observer?.disconnect()
      paneEl.style.removeProperty('--pane-footer-height')
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
