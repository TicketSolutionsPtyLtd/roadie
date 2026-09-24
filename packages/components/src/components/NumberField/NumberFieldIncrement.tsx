'use client'

import type { RefAttributes } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'
import { PlusIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { numberFieldStepperClasses } from './variants'

export type NumberFieldIncrementProps = NumberFieldPrimitive.Increment.Props &
  RefAttributes<HTMLButtonElement>

export function NumberFieldIncrement({
  className,
  children,
  ...props
}: NumberFieldIncrementProps) {
  return (
    <NumberFieldPrimitive.Increment
      data-slot='number-field-increment'
      className={cn(numberFieldStepperClasses, className)}
      {...props}
    >
      {children ?? <PlusIcon weight='bold' className='size-4' />}
    </NumberFieldPrimitive.Increment>
  )
}

NumberFieldIncrement.displayName = 'NumberField.Increment'
