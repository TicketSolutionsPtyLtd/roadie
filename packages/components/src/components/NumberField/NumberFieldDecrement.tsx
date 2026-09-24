'use client'

import { type RefAttributes, use } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'
import { MinusIcon, TrashIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { NumberFieldContext } from './NumberFieldContext'
import { numberFieldStepperClasses, stepperIconClass } from './variants'

export type NumberFieldDecrementProps = NumberFieldPrimitive.Decrement.Props &
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

export function NumberFieldDecrement({
  className,
  children,
  emphasis,
  intent,
  ...props
}: NumberFieldDecrementProps) {
  const context = use(NumberFieldContext)
  const { value, min, step = 1 } = context
  const removes =
    context.removable &&
    value != null &&
    min !== undefined &&
    value > min &&
    value - step <= min
  const Icon = removes ? TrashIcon : MinusIcon

  return (
    <NumberFieldPrimitive.Decrement
      data-slot='number-field-decrement'
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
      {...(removes && { 'aria-label': 'Remove' })}
    >
      {children ?? (
        <Icon weight='bold' className={stepperIconClass(context.size)} />
      )}
    </NumberFieldPrimitive.Decrement>
  )
}

NumberFieldDecrement.displayName = 'NumberField.Decrement'
