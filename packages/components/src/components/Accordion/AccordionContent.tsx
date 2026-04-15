import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type AccordionContentProps = ComponentProps<'div'>

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionContentProps) {
  return (
    <div
      data-slot='accordion-content'
      className={cn('min-h-0 overflow-hidden px-4 pt-1 pb-3', className)}
      {...props}
    >
      {children}
    </div>
  )
}

AccordionContent.displayName = 'Accordion.Content'
