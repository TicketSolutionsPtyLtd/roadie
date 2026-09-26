'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

import { useSliderContext } from './SliderContext'

export type SliderLabelProps = SliderPrimitive.Label.Props &
  RefAttributes<HTMLDivElement>

export function SliderLabel({
  className,
  onClick,
  ...props
}: SliderLabelProps) {
  const { fieldId } = useSliderContext()
  return (
    <SliderPrimitive.Label
      data-slot='slider-label'
      onClick={(event) => {
        onClick?.(event)
        // Base UI only focuses a lone thumb. Inside Field the first thumb's
        // input carries the field id, so a range focuses too.
        if (fieldId) document.getElementById(fieldId)?.focus()
      }}
      className={cn(
        'min-w-0 truncate text-sm font-medium text-normal',
        className
      )}
      {...props}
    />
  )
}

SliderLabel.displayName = 'Slider.Label'
