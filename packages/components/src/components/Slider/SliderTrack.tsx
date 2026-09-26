'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

import { useSliderContext } from './SliderContext'
import { sliderTrackVariants } from './variants'

export type SliderTrackProps = SliderPrimitive.Track.Props &
  RefAttributes<HTMLDivElement>

export function SliderTrack({ className, ...props }: SliderTrackProps) {
  const { size } = useSliderContext()
  return (
    <SliderPrimitive.Track
      data-slot='slider-track'
      className={cn(sliderTrackVariants({ size }), className)}
      {...props}
    />
  )
}

SliderTrack.displayName = 'Slider.Track'
