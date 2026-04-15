import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CardFooterProps = ComponentProps<'div'>

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      data-slot='card-footer'
      className={cn(
        'flex items-center gap-2 px-6 pb-6 group-[.emphasis-subtler]/card:px-0 group-[.emphasis-subtler]/card:pb-0',
        className
      )}
      {...props}
    />
  )
}

CardFooter.displayName = 'Card.Footer'
