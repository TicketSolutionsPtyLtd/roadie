'use client'

import type { RefAttributes } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { NumberFieldContext } from './NumberFieldContext'
import { NumberFieldDecrement } from './NumberFieldDecrement'
import { NumberFieldGroup } from './NumberFieldGroup'
import { NumberFieldIncrement } from './NumberFieldIncrement'
import { NumberFieldInput } from './NumberFieldInput'

export type NumberFieldRootProps = NumberFieldPrimitive.Root.Props &
  RefAttributes<HTMLDivElement> & {
    /** Height of the field and its stepper buttons. */
    size?: 'sm' | 'md' | 'lg'
    /** Field surface. `subtle` swaps the border for a tinted fill. */
    emphasis?: 'normal' | 'subtle'
    /** Marks the value as invalid. Inherits from `Field` when omitted. */
    invalid?: boolean
  }

export function NumberFieldRoot({
  className,
  children,
  size,
  emphasis,
  invalid,
  id,
  required,
  disabled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: NumberFieldRootProps) {
  const fieldContext = useFieldContext()
  // Without children the root renders the input itself, so a label meant for
  // the field has to land on the input rather than the wrapping div.
  const labelProps = {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy
  }

  return (
    <NumberFieldContext
      value={{ size, emphasis, invalid: invalid ?? fieldContext.invalid }}
    >
      <NumberFieldPrimitive.Root
        data-slot='number-field'
        className={cn('grid gap-1.5', className)}
        id={id ?? (fieldContext.fieldId || undefined)}
        required={required ?? fieldContext.required}
        disabled={disabled ?? fieldContext.disabled}
        {...(children !== undefined && labelProps)}
        {...props}
      >
        {children ?? (
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput {...labelProps} />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        )}
      </NumberFieldPrimitive.Root>
    </NumberFieldContext>
  )
}

NumberFieldRoot.displayName = 'NumberField.Root'
