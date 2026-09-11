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

  // Safari lacks `interpolate-size`; keep `--content-height` current while open
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
      // Closed content measures 0; keep the last height so it animates open.
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
