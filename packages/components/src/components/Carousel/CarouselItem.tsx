'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useCarouselContext, useCarouselItem } from './CarouselContext'
import { carouselItemVariants } from './variants'

export type CarouselItemProps = ComponentProps<'div'>

export function CarouselItem({
  className,
  children,
  ...props
}: CarouselItemProps) {
  const { direction } = useCarouselContext()
  const { index, total, isInView } = useCarouselItem()
  return (
    <div
      role='group'
      aria-roledescription='slide'
      aria-label={`${index + 1} of ${total}`}
      tabIndex={-1}
      inert={!isInView}
      data-slot='carousel-item'
      className={cn(carouselItemVariants({ direction }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

CarouselItem.displayName = 'Carousel.Item'
