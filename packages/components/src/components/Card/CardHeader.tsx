import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CardHeaderProps = ComponentProps<'div'>

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot='card-header'
      className={cn(
        'grid gap-1.5 px-6 pt-6 group-[.emphasis-subtler]/card:px-0 group-[.emphasis-subtler]/card:pt-0',
        className
      )}
      {...props}
    />
  )
}

CardHeader.displayName = 'Card.Header'
