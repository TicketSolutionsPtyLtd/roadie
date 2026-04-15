import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CardDescriptionProps = ComponentProps<'p'>

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      data-slot='card-description'
      className={cn('text-sm text-subtle', className)}
      {...props}
    />
  )
}

CardDescription.displayName = 'Card.Description'
