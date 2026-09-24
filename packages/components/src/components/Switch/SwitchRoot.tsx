'use client'

import { type ReactNode, type RefAttributes, useId } from 'react'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { useFieldContext } from '../Field'
import { SwitchThumb } from './SwitchThumb'
import { switchVariants } from './variants'

export type SwitchSize = 'sm' | 'md'

export type SwitchRootProps = SwitchPrimitive.Root.Props &
  RefAttributes<HTMLElement> & {
    /** Colour of the checked track. Accent when unset. */
    intent?: RoadieIntent
    /** @default 'md' */
    size?: SwitchSize
    /** Renders a label beside the switch. `className` then goes on the row. */
    label?: ReactNode
    /** Secondary text under the label, announced as the description. */
    description?: ReactNode
    /** Marks the switch invalid. Inherits from `Field` when unset. */
    invalid?: boolean
  }

export function SwitchRoot({
  className,
  intent,
  size = 'md',
  label,
  description,
  invalid,
  required,
  disabled,
  id,
  children,
  ...props
}: SwitchRootProps) {
  const field = useFieldContext()
  const generatedId = useId()
  const inField = !!field.fieldId
  const inputId = id ?? (inField ? field.fieldId : `switch-${generatedId}`)
  const labelId = label
    ? `${inputId}-label`
    : (inField && field.labelId) || undefined
  const descriptionId = description ? `${inputId}-description` : undefined

  const resolvedInvalid = invalid ?? field.invalid
  const resolvedRequired = required ?? field.required
  const fieldTextId = resolvedInvalid ? field.errorTextId : field.helperTextId
  const describedBy =
    [descriptionId, inField && fieldTextId].filter(Boolean).join(' ') ||
    undefined

  const control = (
    <SwitchPrimitive.Root
      data-slot='switch'
      id={inputId}
      required={resolvedRequired}
      disabled={disabled ?? field.disabled}
      aria-invalid={resolvedInvalid || undefined}
      aria-required={resolvedRequired || undefined}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      className={cn(switchVariants({ intent, size }), !label && className)}
      {...props}
    >
      {children ?? <SwitchThumb />}
    </SwitchPrimitive.Root>
  )

  if (!label) return control

  return (
    <div
      data-slot='switch-row'
      className={cn(
        'group/switch flex items-center justify-between gap-4',
        className
      )}
    >
      <div className='grid gap-0.5 group-has-data-disabled/switch:opacity-50'>
        <label
          id={labelId}
          htmlFor={inputId}
          className={cn(
            'cursor-pointer font-medium text-normal select-none group-has-data-disabled/switch:cursor-not-allowed',
            size === 'sm' ? 'text-sm' : 'text-base'
          )}
        >
          {label}
        </label>
        {description && (
          <p id={descriptionId} className='text-sm text-subtle'>
            {description}
          </p>
        )}
      </div>
      {control}
    </div>
  )
}

SwitchRoot.displayName = 'Switch.Root'
