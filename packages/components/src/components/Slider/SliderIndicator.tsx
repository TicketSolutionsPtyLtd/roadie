'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

export type SliderIndicatorProps = SliderPrimitive.Indicator.Props &
  RefAttributes<HTMLDivElement>

export function SliderIndicator({ className, ...props }: SliderIndicatorProps) {
  return (
    <SliderPrimitive.Indicator
      data-slot='slider-indicator'
      className={cn(
        'rounded-full bg-strong group-data-invalid/slider:intent-danger',
        'forced-color-adjust-none forced-colors:bg-[CanvasText]',
        className
      )}
      {...props}
    />
  )
}

SliderIndicator.displayName = 'Slider.Indicator'
