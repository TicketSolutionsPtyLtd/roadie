'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

import { useSliderContext } from './SliderContext'
import { sliderControlVariants } from './variants'

export type SliderControlProps = SliderPrimitive.Control.Props &
  RefAttributes<HTMLDivElement>

export function SliderControl({ className, ...props }: SliderControlProps) {
  const { size } = useSliderContext()
  return (
    <SliderPrimitive.Control
      data-slot='slider-control'
      className={cn(sliderControlVariants({ size }), className)}
      {...props}
    />
  )
}

SliderControl.displayName = 'Slider.Control'
