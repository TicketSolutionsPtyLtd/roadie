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
  onPointerDown,
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
      onPointerDown={(event) => {
        // Base UI moves focus to the input on a mouse press so the arrow keys
        // keep working. That focus isn't the person's, so it shows no ring.
        if (event.pointerType === 'mouse') context.setPointerFocus?.(true)
        onPointerDown?.(event)
      }}
      {...props}
    >
      {children ?? (
        <PlusIcon weight='bold' className={stepperIconClass(context.size)} />
      )}
    </NumberFieldPrimitive.Increment>
  )
}

NumberFieldIncrement.displayName = 'NumberField.Increment'
