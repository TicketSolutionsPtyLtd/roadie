'use client'

import type { RefAttributes } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'
import { MinusIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { numberFieldStepperClasses } from './variants'

export type NumberFieldDecrementProps = NumberFieldPrimitive.Decrement.Props &
  RefAttributes<HTMLButtonElement>

export function NumberFieldDecrement({
  className,
  children,
  ...props
}: NumberFieldDecrementProps) {
  return (
    <NumberFieldPrimitive.Decrement
      data-slot='number-field-decrement'
      className={cn(numberFieldStepperClasses, className)}
      {...props}
    >
      {children ?? <MinusIcon weight='bold' className='size-4' />}
    </NumberFieldPrimitive.Decrement>
  )
}

NumberFieldDecrement.displayName = 'NumberField.Decrement'
