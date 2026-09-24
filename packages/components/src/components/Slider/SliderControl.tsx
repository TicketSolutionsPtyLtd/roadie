'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

export type SliderControlProps = SliderPrimitive.Control.Props &
  RefAttributes<HTMLDivElement>

// The padding makes the control a 44px target and keeps the thumbs inside it
// at min and max. Base UI subtracts the padding, so values still line up.
export function SliderControl({ className, ...props }: SliderControlProps) {
  return (
    <SliderPrimitive.Control
      data-slot='slider-control'
      className={cn(
        'col-span-full flex touch-none items-center px-2.5 py-3 select-none',
        'data-[orientation=vertical]:h-40 data-[orientation=vertical]:w-11 data-[orientation=vertical]:justify-center data-[orientation=vertical]:px-3 data-[orientation=vertical]:py-2.5',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

SliderControl.displayName = 'Slider.Control'
