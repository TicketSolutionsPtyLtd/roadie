'use client'

import { type RefAttributes, use } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'
import { PlusIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { NumberFieldContext } from './NumberFieldContext'
import { numberFieldStepperClasses, stepperIconClass } from './variants'

export type NumberFieldIncrementProps = NumberFieldPrimitive.Increment.Props &
  RefAttributes<HTMLButtonElement> & {
    /** Button surface. Defaults to `subtler` in the field, `normal` standalone. */
    emphasis?: 'strong' | 'normal' | 'subtle' | 'subtler'
    /** Colour palette for the button. Inherits from context when omitted. */
    intent?:
      | 'neutral'
      | 'brand'
      | 'brand-secondary'
      | 'accent'
      | 'danger'
      | 'success'
      | 'warning'
      | 'info'
  }

export function NumberFieldIncrement({
  className,
  children,
  emphasis,
  intent,
  ...props
}: NumberFieldIncrementProps) {
  const context = use(NumberFieldContext)

  return (
    <NumberFieldPrimitive.Increment
      data-slot='number-field-increment'
      className={cn(
        numberFieldStepperClasses({
          fieldEmphasis: context.emphasis,
          size: context.size,
          emphasis,
          intent
        }),
        className
      )}
      {...props}
    >
      {children ?? (
        <PlusIcon weight='bold' className={stepperIconClass(context.size)} />
      )}
    </NumberFieldPrimitive.Increment>
  )
}

NumberFieldIncrement.displayName = 'NumberField.Increment'
