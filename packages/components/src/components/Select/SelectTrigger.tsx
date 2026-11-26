'use client'

import { type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { useFieldContext } from '../Field'
import { useFieldControlProps } from '../Field/FieldContext'
import { SelectContext } from './SelectContext'
import { selectTriggerVariants } from './variants'

export type SelectTriggerProps = SelectPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement> &
  Omit<
    VariantProps<typeof selectTriggerVariants>,
    'intent' | 'emphasis' | 'size'
  > & {
    /**
     * `subtler` drops the fill and border for quiet in-context controls,
     * such as rows per page.
     *
     * @default 'normal'
     */
    emphasis?: 'normal' | 'subtle' | 'subtler' | null
    /** @default 'md' */
    size?: 'sm' | 'md' | 'lg' | null
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
  'aria-describedby': describedBy,
  ...props
}: SelectTriggerProps) {
  const inField = !!useFieldContext().fieldId
  const { invalid } = use(SelectContext)
  const fieldProps = useFieldControlProps(
    { invalid, 'aria-describedby': describedBy },
    { labelled: true }
  )

  return (
    <SelectPrimitive.Trigger
      data-slot='select-trigger'
      className={cn(
        selectTriggerVariants({
          intent,
          emphasis: emphasis ?? undefined,
          size,
          className
        })
      )}
      {...(inField && {
        'aria-labelledby': fieldProps['aria-labelledby'],
        'aria-invalid': fieldProps['aria-invalid'],
        'aria-required': fieldProps['aria-required']
      })}
      {...props}
      aria-describedby={fieldProps['aria-describedby']}
    />
  )
}

SelectTrigger.displayName = 'Select.Trigger'
