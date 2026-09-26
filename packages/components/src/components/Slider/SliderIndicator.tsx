'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

export type SliderIndicatorProps = SliderPrimitive.Indicator.Props &
  RefAttributes<HTMLDivElement>

// Pulled over the track's border so the fill covers it edge to edge.
export function SliderIndicator({ className, ...props }: SliderIndicatorProps) {
  return (
    <SliderPrimitive.Indicator
      data-slot='slider-indicator'
      className={cn(
        'rounded-full bg-[var(--color-accent-9)] group-data-invalid/slider:bg-[var(--color-danger-9)]',
        '-my-px data-[orientation=vertical]:-mx-px data-[orientation=vertical]:my-0',
        'forced-color-adjust-none forced-colors:bg-[CanvasText]',
        className
      )}
      {...props}
    />
  )
}

SliderIndicator.displayName = 'Slider.Indicator'
