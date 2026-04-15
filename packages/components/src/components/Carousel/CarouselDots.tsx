'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useCarouselContext } from './CarouselContext'
import { carouselDotsVariants } from './variants'

export type CarouselDotsProps = ComponentProps<'div'>

export function CarouselDots({ className, ...props }: CarouselDotsProps) {
  const { direction, snapCount, selectedIndex, canScroll, goTo } =
    useCarouselContext()
  if (!canScroll) return null
  return (
    <div
      role='group'
      aria-label='Choose slide to display'
      data-slot='carousel-dots'
      className={cn(carouselDotsVariants({ direction }), className)}
      {...props}
    >
      {Array.from({ length: snapCount }, (_, index) => {
        const isActive = index === selectedIndex
        return (
          <button
            key={index}
            type='button'
            aria-label={`Go to slide ${index + 1}`}
            aria-current={isActive ? 'true' : undefined}
            aria-disabled={isActive || undefined}
            data-slot='carousel-dot'
            onClick={() => goTo(index)}
            className={cn(
              'is-interactive h-2 rounded-full transition-all',
              isActive
                ? 'w-5 emphasis-strong intent-accent'
                : 'w-2 emphasis-normal'
            )}
          />
        )
      })}
    </div>
  )
}

CarouselDots.displayName = 'Carousel.Dots'
