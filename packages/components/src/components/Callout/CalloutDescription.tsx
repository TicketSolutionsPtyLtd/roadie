import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CalloutDescriptionProps = ComponentProps<'div'>

/** The body. A `div`, so it can hold paragraphs, links and lists. */
export function CalloutDescription({
  className,
  ...props
}: CalloutDescriptionProps) {
  return (
    <div
      data-slot='callout-description'
      className={cn(
        'col-start-2 row-start-2 [[data-slot=callout-title]~&]:mt-1',
        className
      )}
      {...props}
    />
  )
}

CalloutDescription.displayName = 'Callout.Description'
