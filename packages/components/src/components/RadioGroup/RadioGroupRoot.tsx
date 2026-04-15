'use client'

import { type RefAttributes } from 'react'

import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { RadioGroupContext, type RadioGroupEmphasis } from './RadioGroupContext'
import { radioGroupVariants } from './variants'

export type RadioGroupRootProps = RadioGroupPrimitive.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof radioGroupVariants> & {
    emphasis?: RadioGroupEmphasis
    invalid?: boolean
    required?: boolean
  }

export function RadioGroupRoot({
  className,
  direction = 'vertical',
  emphasis = 'subtler',
  invalid,
  required,
  ...props
}: RadioGroupRootProps) {
  const fieldContext = useFieldContext()
  const resolvedInvalid = invalid ?? fieldContext.invalid
  const resolvedRequired = required ?? fieldContext.required
  const inField = !!fieldContext.fieldId

  return (
    <RadioGroupContext
      value={{
        emphasis,
        direction: direction ?? 'vertical',
        invalid: resolvedInvalid,
        required: resolvedRequired
      }}
    >
      <RadioGroupPrimitive
        data-slot='radio-group'
        className={cn(radioGroupVariants({ direction, className }))}
        {...(inField && {
          'aria-labelledby': fieldContext.labelId || undefined,
          'aria-describedby': resolvedInvalid
            ? fieldContext.errorTextId || undefined
            : fieldContext.helperTextId || undefined
        })}
        {...props}
      />
    </RadioGroupContext>
  )
}

RadioGroupRoot.displayName = 'RadioGroup.Root'
