'use client'

import { type RefAttributes, useState } from 'react'

import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group'

import { cn } from '@oztix/roadie-core/utils'

import {
  type CheckboxEmphasis,
  CheckboxGroupContext,
  type CheckboxGroupDirection
} from '../Checkbox/CheckboxGroupContext'
import { useFieldContext } from '../Field'
import { checkboxGroupVariants } from './variants'

export type CheckboxGroupRootProps = CheckboxGroupPrimitive.Props &
  RefAttributes<HTMLDivElement> & {
    direction?: CheckboxGroupDirection
    emphasis?: CheckboxEmphasis
    invalid?: boolean
    required?: boolean
  }

export function CheckboxGroupRoot({
  className,
  direction = 'vertical',
  emphasis = 'subtler',
  invalid,
  required,
  disabled,
  ...props
}: CheckboxGroupRootProps) {
  const fieldContext = useFieldContext()
  const resolvedInvalid = invalid ?? fieldContext.invalid
  const resolvedRequired = required ?? fieldContext.required
  const inField = !!fieldContext.fieldId
  const [labelId, setLabelId] = useState<string>()

  return (
    <CheckboxGroupContext
      value={{
        emphasis,
        direction,
        invalid: resolvedInvalid,
        required: resolvedRequired,
        setLabelId
      }}
    >
      <CheckboxGroupPrimitive
        data-slot='checkbox-group'
        className={cn(checkboxGroupVariants({ direction, className }))}
        disabled={disabled ?? fieldContext.disabled}
        aria-labelledby={
          labelId ?? ((inField && fieldContext.labelId) || undefined)
        }
        aria-describedby={
          (inField &&
            (resolvedInvalid
              ? fieldContext.errorTextId
              : fieldContext.helperTextId)) ||
          undefined
        }
        {...props}
      />
    </CheckboxGroupContext>
  )
}

CheckboxGroupRoot.displayName = 'CheckboxGroup.Root'
