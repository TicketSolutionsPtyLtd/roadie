'use client'

import type { RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { mergeClassName } from '../../utils/mergeClassName'

export type SliderValueProps = SliderPrimitive.Value.Props &
  RefAttributes<HTMLOutputElement>

export function SliderValue({ className, ...props }: SliderValueProps) {
  return (
    <SliderPrimitive.Value
      data-slot='slider-value'
      className={mergeClassName(
        'col-start-2 text-end text-sm text-subtle tabular-nums',
        className
      )}
      {...props}
    />
  )
}

SliderValue.displayName = 'Slider.Value'
