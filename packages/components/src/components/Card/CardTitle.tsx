import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CardTitleProps = ComponentProps<'h3'>

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      data-slot='card-title'
      className={cn('text-display-ui-6 text-strong', className)}
      {...props}
    />
  )
}

CardTitle.displayName = 'Card.Title'
