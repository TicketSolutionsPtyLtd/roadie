'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

export type SliderLabelProps = SliderPrimitive.Label.Props &
  RefAttributes<HTMLDivElement>

export function SliderLabel({ className, ...props }: SliderLabelProps) {
  return (
    <SliderPrimitive.Label
      data-slot='slider-label'
      className={cn(
        'min-w-0 truncate text-sm font-medium text-normal',
        className
      )}
      {...props}
    />
  )
}

SliderLabel.displayName = 'Slider.Label'
