'use client'

import { type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { useFieldContext } from '../Field'
import { SelectContext } from './SelectContext'
import { selectTriggerVariants } from './variants'

export type SelectTriggerProps = SelectPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement> &
  Omit<VariantProps<typeof selectTriggerVariants>, 'intent'> & {
    /**
     * @deprecated Form controls take their colour from state;
     * `is-interactive-field` handles it. Will be removed in v3.0.0.
     */
    intent?: RoadieIntent | null
  }

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
        'aria-describedby': fieldContext.invalid
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
