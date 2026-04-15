'use client'

import type { ReactNode } from 'react'

import { CaretLeftIcon, CaretUpIcon } from '@phosphor-icons/react/ssr'

import { IconButton, type IconButtonProps } from '../Button/IconButton'
import { useCarouselContext } from './CarouselContext'

export type CarouselNavButtonProps = Omit<
  IconButtonProps,
  'aria-label' | 'children'
> & {
  /**
   * Override the default accessible label.
   * Defaults to "Previous slide" / "Next slide" / "Pause carousel" / "Play carousel".
   */
  'aria-label'?: string
  /** Override the default caret/play/pause icon. */
  children?: ReactNode
}

// Use `data-disabled` (which `is-interactive` already styles identically
// to native `:disabled`) rather than the native `disabled` attribute.
// Native `disabled` removes the button from the tab order entirely, which
// means screen-reader users at a scroll boundary lose their place in the
// carousel region. `data-disabled` keeps the button focusable + dims it +
// disables pointer events via the Roadie styling, and the conditional
// `onClick` guards against keyboard (Space/Enter) activation when the
// nav direction is unavailable.
export function CarouselPrevious({
  className,
  'aria-label': ariaLabel = 'Previous slide',
  children,
  ...props
}: CarouselNavButtonProps) {
  const { direction, canScroll, canGoToPrev, goToPrev } = useCarouselContext()
  if (!canScroll) return null
  const Icon = direction === 'vertical' ? CaretUpIcon : CaretLeftIcon
  return (
    <IconButton
      size='icon-sm'
      className={className}
      aria-label={ariaLabel}
      aria-disabled={!canGoToPrev || undefined}
      data-disabled={!canGoToPrev || undefined}
      data-slot='carousel-previous'
      onClick={canGoToPrev ? goToPrev : undefined}
      {...props}
    >
      {children ?? <Icon weight='bold' className='size-4' />}
    </IconButton>
  )
}

CarouselPrevious.displayName = 'Carousel.Previous'
