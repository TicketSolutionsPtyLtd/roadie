'use client'

import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react/ssr'

import { IconButton } from '../Button/IconButton'
import { useCarouselContext } from './CarouselContext'
import type { CarouselNavButtonProps } from './CarouselPrevious'

export function CarouselNext({
  className,
  'aria-label': ariaLabel = 'Next slide',
  children,
  ...props
}: CarouselNavButtonProps) {
  const { direction, canScroll, canGoToNext, goToNext } = useCarouselContext()
  if (!canScroll) return null
  const Icon = direction === 'vertical' ? CaretDownIcon : CaretRightIcon
  return (
    <IconButton
      size='icon-sm'
      className={className}
      aria-label={ariaLabel}
      aria-disabled={!canGoToNext || undefined}
      data-disabled={!canGoToNext || undefined}
      data-slot='carousel-next'
      onClick={canGoToNext ? goToNext : undefined}
      {...props}
    >
      {children ?? <Icon weight='bold' className='size-4' />}
    </IconButton>
  )
}

CarouselNext.displayName = 'Carousel.Next'
