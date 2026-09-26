'use client'

import type { RefAttributes } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'
import { ArrowsHorizontalIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type NumberFieldScrubAreaCursorProps =
  NumberFieldPrimitive.ScrubAreaCursor.Props & RefAttributes<HTMLSpanElement>

export function NumberFieldScrubAreaCursor({
  className,
  children,
  ...props
}: NumberFieldScrubAreaCursorProps) {
  return (
    <NumberFieldPrimitive.ScrubAreaCursor
      data-slot='number-field-scrub-area-cursor'
      className={cn('text-strong drop-shadow-sm', className)}
      {...props}
    >
      {children ?? <ArrowsHorizontalIcon weight='bold' className='size-5' />}
    </NumberFieldPrimitive.ScrubAreaCursor>
  )
}

NumberFieldScrubAreaCursor.displayName = 'NumberField.ScrubAreaCursor'
