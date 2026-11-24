'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useCarouselContext } from './CarouselContext'
import { carouselHiddenClass } from './variants'

export type CarouselControlsProps = ComponentProps<'div'> & {
  /**
   * Render the controls even when there's nothing to scroll to. Useful
   * when the slot contains custom buttons (filters, share) that aren't
   * gated on slide count.
   */
  forceVisible?: boolean
}

export function CarouselControls({
  className,
  forceVisible = false,
  ...props
}: CarouselControlsProps) {
  const { canScroll } = useCarouselContext()
  return (
    <div
      data-slot='carousel-controls'
      data-hidden={(!forceVisible && !canScroll) || undefined}
      className={cn(
        'hidden items-center gap-2 md:flex',
        carouselHiddenClass,
        className
      )}
      {...props}
    />
  )
}

CarouselControls.displayName = 'Carousel.Controls'
