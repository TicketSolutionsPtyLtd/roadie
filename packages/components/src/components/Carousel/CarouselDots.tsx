'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useCarouselContext } from './CarouselContext'
import { dotWindow } from './dotWindow'
import { carouselDotsVariants, carouselHiddenClass } from './variants'

export type CarouselDotsProps = ComponentProps<'div'> & {
  /**
   * The most dots to draw at once. With more slides than this, the dots show
   * a window that slides to keep the current one in the middle, and the dot
   * at each end of the window is drawn smaller while there are slides past
   * it. Leave it off to draw a dot for every slide.
   */
  max?: number
  /**
   * Names each dot, given the 0-based index of the slide it goes to and the
   * number of slides (pages, when slides scroll in groups). The index counts
   * from the first slide, not from the start of the window `max` draws.
   * Defaults to "Go to slide N".
   */
  getDotLabel?: (index: number, count: number) => string
}

const defaultDotLabel = (index: number) => `Go to slide ${index + 1}`

export function CarouselDots({
  className,
  max,
  getDotLabel = defaultDotLabel,
  ...props
}: CarouselDotsProps) {
  const { direction, snapCount, selectedIndex, canScroll, goTo } =
    useCarouselContext()
  const { start, size } = dotWindow(snapCount, selectedIndex, max)
  return (
    <div
      role='group'
      aria-label='Choose slide to display'
      data-slot='carousel-dots'
      hidden={!canScroll}
      data-hidden={!canScroll || undefined}
      className={cn(
        carouselDotsVariants({ direction }),
        carouselHiddenClass,
        className
      )}
      {...props}
    >
      {Array.from({ length: size }, (_, offset) => {
        const index = start + offset
        const isActive = index === selectedIndex
        const isEdge =
          !isActive &&
          ((offset === 0 && start > 0) ||
            (offset === size - 1 && start + size < snapCount))
        return (
          <button
            key={index}
            type='button'
            aria-label={getDotLabel(index, snapCount)}
            aria-current={isActive ? 'true' : undefined}
            aria-disabled={isActive || undefined}
            data-slot='carousel-dot'
            onClick={() => goTo(index)}
            className={cn(
              'h-2 rounded-full transition-all',
              // The current dot does nothing when pressed, so it has no hover.
              // On a strong surface the accent can match the surface, so it
              // takes the surface's own foreground instead.
              isActive
                ? 'is-focusable w-5 emphasis-strong intent-accent in-[.emphasis-strong]:bg-current in-[.emphasis-strong]:text-inherit'
                : 'is-interactive w-2 emphasis-normal',
              isEdge && 'scale-50'
            )}
          />
        )
      })}
    </div>
  )
}

CarouselDots.displayName = 'Carousel.Dots'
