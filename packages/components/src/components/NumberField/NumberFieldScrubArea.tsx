'use client'

import type { RefAttributes } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'

import { mergeClassName } from '../../utils/mergeClassName'

export type NumberFieldScrubAreaProps = NumberFieldPrimitive.ScrubArea.Props &
  RefAttributes<HTMLSpanElement>

export function NumberFieldScrubArea({
  className,
  ...props
}: NumberFieldScrubAreaProps) {
  return (
    <NumberFieldPrimitive.ScrubArea
      data-slot='number-field-scrub-area'
      className={mergeClassName(
        'w-fit cursor-ew-resize select-none',
        className
      )}
      {...props}
    />
  )
}

NumberFieldScrubArea.displayName = 'NumberField.ScrubArea'
