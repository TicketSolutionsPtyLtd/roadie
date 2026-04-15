'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { AccordionContext, accordionItemVariants } from './AccordionContext'

export type AccordionItemProps = ComponentProps<'details'>

export function AccordionItem({
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { name, emphasis } = use(AccordionContext)
  const itemEmphasis = accordionItemVariants[emphasis ?? 'normal']

  return (
    <details
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
