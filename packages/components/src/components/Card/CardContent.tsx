import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CardContentProps = ComponentProps<'div'>

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      data-slot='card-content'
      className={cn(
        'px-6 py-4 group-[.emphasis-subtler]/card:px-0 group-[.emphasis-subtler]/card:py-0',
        className
      )}
      {...props}
    />
  )
}

CardContent.displayName = 'Card.Content'
