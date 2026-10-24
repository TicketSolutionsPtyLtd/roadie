'use client'

import { type RefAttributes, useState } from 'react'

import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { RadioGroupContext, type RadioGroupEmphasis } from './RadioGroupContext'
import { type RadioGroupSize, radioGroupVariants } from './variants'

export type RadioGroupRootProps = RadioGroupPrimitive.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof radioGroupVariants> & {
    emphasis?: RadioGroupEmphasis
    /** Sets every item's size. @default 'md' */
    size?: RadioGroupSize
    invalid?: boolean
    required?: boolean
  }

export function RadioGroupRoot({
  className,
  direction = 'vertical',
  emphasis = 'subtler',
  size = 'md',
  invalid,
  required,
  disabled,
  ...props
}: RadioGroupRootProps) {
  const fieldContext = useFieldContext()
  const resolvedInvalid = invalid ?? fieldContext.invalid
  const resolvedRequired = required ?? fieldContext.required
  const inField = !!fieldContext.fieldId
  const [labelId, setLabelId] = useState<string>()

  return (
    <RadioGroupContext
      value={{
        emphasis,
        direction: direction ?? 'vertical',
        size,
        invalid: resolvedInvalid,
        required: resolvedRequired,
        setLabelId
      }}
    >
      <RadioGroupPrimitive
        data-slot='radio-group'
        className={cn(radioGroupVariants({ direction, size, className }))}
        disabled={disabled ?? fieldContext.disabled}
        aria-invalid={resolvedInvalid || undefined}
        aria-labelledby={
          labelId ?? ((inField && fieldContext.labelId) || undefined)
        }
        aria-describedby={
          (inField &&
            (fieldContext.invalid
              ? fieldContext.errorTextId
              : fieldContext.helperTextId)) ||
          undefined
        }
        {...props}
      />
    </RadioGroupContext>
  )
}

RadioGroupRoot.displayName = 'RadioGroup.Root'
