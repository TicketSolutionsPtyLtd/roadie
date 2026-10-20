import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { CardContentMarker } from './CardContentCheck'

export type CardContentProps = ComponentProps<'div'>

/** The card's body, which every card needs. A card with only a title and description puts them here, since `Card.Header` has no bottom padding. Without one, Card warns in development. */
export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <>
      {isDev() && <CardContentMarker />}
      <div
        data-slot='card-content'
        className={cn(
          'px-6 py-4 group-[.emphasis-subtler]/card:px-0 group-[.emphasis-subtler]/card:py-0',
          className
        )}
        {...props}
      />
    </>
  )
}

CardContent.displayName = 'Card.Content'
