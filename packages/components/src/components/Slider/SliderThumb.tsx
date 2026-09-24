'use client'

import { type RefAttributes, useLayoutEffect, useMemo, useState } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { useSliderContext } from './SliderContext'

export type SliderThumbProps = SliderPrimitive.Thumb.Props &
  RefAttributes<HTMLDivElement>

export function SliderThumb({
  className,
  inputRef: inputRefProp,
  'aria-describedby': ariaDescribedBy,
  ...props
}: SliderThumbProps) {
  const { invalid, describedBy, fieldId } = useSliderContext()
  const isFirstThumb = (props.index ?? 0) === 0
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const mergedInputRef = useMemo(
    () => mergeRefs(setInput, inputRefProp),
    [inputRefProp]
  )

  // Base UI only sets aria-invalid and the input id from its own Field, and
  // the input is rendered inside the thumb with no prop to reach it.
  useLayoutEffect(() => {
    if (invalid) input?.setAttribute('aria-invalid', 'true')
    else input?.removeAttribute('aria-invalid')
  }, [input, invalid])

  useLayoutEffect(() => {
    if (fieldId && isFirstThumb) input?.setAttribute('id', fieldId)
  }, [input, fieldId, isFirstThumb])

  return (
    <SliderPrimitive.Thumb
      data-slot='slider-thumb'
      inputRef={mergedInputRef}
      aria-describedby={ariaDescribedBy ?? describedBy}
      className={cn(
        'relative size-5 rounded-full bg-[var(--color-neutral-light-0)] shadow-[var(--rim-light-strong),var(--shadow-md)] select-none',
        'before:absolute before:-inset-3 before:rounded-full',
        'transition-[outline-width,outline-color] duration-moderate',
        'outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] has-focus-visible:outline-[length:var(--focus-ring-width)]',
        'group-data-invalid/slider:outline-[color-mix(in_oklch,var(--color-danger-9)_var(--focus-ring-opacity),transparent)]',
        'data-disabled:cursor-not-allowed data-dragging:cursor-grabbing',
        'forced-colors:border forced-colors:border-[CanvasText]',
        className
      )}
      {...props}
    />
  )
}

SliderThumb.displayName = 'Slider.Thumb'
