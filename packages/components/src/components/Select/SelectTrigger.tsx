'use client'

import { type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { SelectContext } from './SelectContext'
import { selectTriggerVariants } from './variants'

export type SelectTriggerProps = SelectPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement> &
  VariantProps<typeof selectTriggerVariants>

export function SelectTrigger({
  className,
  intent,
  emphasis,
  size,
  ...props
}: SelectTriggerProps) {
  const fieldContext = useFieldContext()
  const { invalid } = use(SelectContext)
  const inField = !!fieldContext.fieldId

  return (
    <SelectPrimitive.Trigger
      data-slot='select-trigger'
      className={cn(
        selectTriggerVariants({ intent, emphasis, size, className })
      )}
      {...(inField && {
        'aria-labelledby': fieldContext.labelId || undefined,
        'aria-describedby': invalid
          ? fieldContext.errorTextId || undefined
          : fieldContext.helperTextId || undefined,
        'aria-invalid': invalid || undefined,
        'aria-required': fieldContext.required || undefined
      })}
      {...props}
    />
  )
}

SelectTrigger.displayName = 'Select.Trigger'
