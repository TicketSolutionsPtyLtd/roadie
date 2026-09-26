'use client'

import { type ReactNode, type RefAttributes, useId } from 'react'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { CheckIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { isEmptyNode } from '../../utils/isEmptyNode'
import { useFieldContext } from '../Field'
import { SwitchThumb } from './SwitchThumb'
import { switchTickVariants, switchVariants } from './variants'

export type SwitchSize = 'sm' | 'md'

export type SwitchRootProps = SwitchPrimitive.Root.Props &
  RefAttributes<HTMLElement> & {
    /** @default 'md' */
    size?: SwitchSize
    /** Renders a label beside the switch. With `label` or `description`, `className` goes on the row. */
    label?: ReactNode
    /** Secondary text under the label, announced as the description. */
    description?: ReactNode
    /** Marks the switch invalid. Inherits from `Field` when unset. */
    invalid?: boolean
  }

export function SwitchRoot({
  className,
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
  const hasLabel = !isEmptyNode(label)
  const hasDescription = !isEmptyNode(description)
  const labelId = hasLabel
    ? `${inputId}-label`
    : (inField && field.labelId) || undefined
  const descriptionId = hasDescription ? `${inputId}-description` : undefined

  const resolvedInvalid = invalid ?? field.invalid
  const resolvedRequired = required ?? field.required
  const fieldTextId = field.invalid ? field.errorTextId : field.helperTextId
  const describedBy =
    [descriptionId, inField && fieldTextId].filter(Boolean).join(' ') ||
    undefined

  const hasRow = hasLabel || hasDescription

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
      className={cn(switchVariants({ size }), !hasRow && className)}
      {...props}
    >
      <span
        data-slot='switch-tick'
        aria-hidden
        className={switchTickVariants()}
      >
        <CheckIcon weight='bold' className='size-(--switch-tick)' />
      </span>
      {children ?? <SwitchThumb />}
    </SwitchPrimitive.Root>
  )

  if (!hasRow) return control

  return (
    <div
      data-slot='switch-row'
      className={cn(
        'group/switch flex items-center justify-between gap-4',
        className
      )}
    >
      <div className='grid gap-0.5 group-has-data-disabled/switch:opacity-50'>
        {hasLabel && (
          <label
            id={labelId}
            htmlFor={inputId}
            className='cursor-pointer text-sm text-normal select-none group-has-data-disabled/switch:cursor-not-allowed'
          >
            {label}
          </label>
        )}
        {hasDescription && (
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
