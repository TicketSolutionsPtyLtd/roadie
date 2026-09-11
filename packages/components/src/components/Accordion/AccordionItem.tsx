'use client'

import { type ComponentProps, use, useEffect, useMemo, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { AccordionContext, accordionItemVariants } from './AccordionContext'

export type AccordionItemProps = ComponentProps<'details'>

export function AccordionItem({
  className,
  children,
  ref: forwardedRef,
  ...props
}: AccordionItemProps) {
  const { name, emphasis } = use(AccordionContext)
  const itemEmphasis = accordionItemVariants[emphasis ?? 'normal']
  const ref = useRef<HTMLDetailsElement>(null)
  const mergedRef = useMemo(() => mergeRefs(ref, forwardedRef), [forwardedRef])

  // Safari only. Without `interpolate-size` the open height is pinned to a
  // measured `--content-height`, and `Accordion.Trigger` can only take that
  // measurement as the panel opens. Anything that changes the content while
  // it is already open — filtering a list inside it, paging in more rows —
  // would keep the stale height and clip or pad the panel. Watching the
  // content keeps the variable honest for as long as the panel is open.
  useEffect(() => {
    if (
      typeof CSS !== 'undefined' &&
      CSS.supports?.('interpolate-size', 'allow-keywords')
    )
      return

    const details = ref.current
    const content = details?.querySelector(
      ':scope > :not(summary)'
    ) as HTMLElement | null
    if (!details || !content) return

    const sync = () => {
      // Closed, the content is hidden and measures 0 — keeping the last known
      // height is what lets it animate back open.
      if (!details.open) return
      details.style.setProperty('--content-height', `${content.scrollHeight}px`)
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  return (
    <details
      ref={mergedRef}
      name={name}
      data-slot='accordion-item'
      className={cn(
        'group/item is-disclosure-animated',
        itemEmphasis,
        className
      )}
      {...props}
    >
      {children}
    </details>
  )
}

AccordionItem.displayName = 'Accordion.Item'
