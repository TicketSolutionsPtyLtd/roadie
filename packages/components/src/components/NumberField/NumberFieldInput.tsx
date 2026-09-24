'use client'

import { type RefAttributes, use } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { NumberFieldContext } from './NumberFieldContext'

export type NumberFieldInputProps = NumberFieldPrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

export function NumberFieldInput({
  className,
  ...props
}: NumberFieldInputProps) {
  const { invalid } = use(NumberFieldContext)
  const { errorTextId, helperTextId } = useFieldContext()

  return (
    <NumberFieldPrimitive.Input
      data-slot='number-field-input'
      className={cn(
        'h-full w-full min-w-0 flex-1 bg-transparent px-2 text-center text-normal tabular-nums outline-none placeholder:text-subtle',
        className
      )}
      aria-invalid={invalid || undefined}
      aria-describedby={(invalid ? errorTextId : helperTextId) || undefined}
      {...props}
    />
  )
}

NumberFieldInput.displayName = 'NumberField.Input'
