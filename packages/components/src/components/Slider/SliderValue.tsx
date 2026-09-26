'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

export type SliderValueProps = SliderPrimitive.Value.Props &
  RefAttributes<HTMLOutputElement>

// With no Slider.Label before it, as inside Field, the value sits at the end
// of the track instead of taking a row between the label and the track.
export function SliderValue({ className, ...props }: SliderValueProps) {
  return (
    <SliderPrimitive.Value
      data-slot='slider-value'
      className={cn(
        'peer/value col-start-2 text-end text-sm text-subtle tabular-nums first:row-start-1 first:self-center',
        className
      )}
      {...props}
    />
  )
}

SliderValue.displayName = 'Slider.Value'
