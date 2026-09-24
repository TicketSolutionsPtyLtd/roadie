'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

export type SliderTrackProps = SliderPrimitive.Track.Props &
  RefAttributes<HTMLDivElement>

export function SliderTrack({ className, ...props }: SliderTrackProps) {
  return (
    <SliderPrimitive.Track
      data-slot='slider-track'
      className={cn(
        'relative h-1.5 w-full rounded-full bg-(--intent-4)',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5',
        'forced-colors:outline forced-colors:outline-1',
        className
      )}
      {...props}
    />
  )
}

SliderTrack.displayName = 'Slider.Track'
