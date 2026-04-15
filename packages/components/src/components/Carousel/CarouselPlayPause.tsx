'use client'

import { PauseIcon, PlayIcon } from '@phosphor-icons/react/ssr'

import { IconButton } from '../Button/IconButton'
import { useCarouselContext } from './CarouselContext'
import type { CarouselNavButtonProps } from './CarouselPrevious'

export function CarouselPlayPause({
  className,
  'aria-label': ariaLabel,
  children,
  ...props
}: CarouselNavButtonProps) {
  const { autoPlay, isPlaying, toggle } = useCarouselContext()
  if (autoPlay === false) return null
  const label = ariaLabel ?? (isPlaying ? 'Pause carousel' : 'Play carousel')
  return (
    <IconButton
      size='icon-sm'
      className={className}
      aria-label={label}
      aria-pressed={!isPlaying}
      data-slot='carousel-play-pause'
      onClick={toggle}
      {...props}
    >
      {children ??
        (isPlaying ? (
          <PauseIcon weight='bold' className='size-4 text-subtle' />
        ) : (
          <PlayIcon weight='bold' className='size-4 text-subtle' />
        ))}
    </IconButton>
  )
}

CarouselPlayPause.displayName = 'Carousel.PlayPause'
