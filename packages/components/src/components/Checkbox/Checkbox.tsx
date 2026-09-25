'use client'

import { type ReactNode, type RefAttributes, use, useId } from 'react'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon, MinusIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { isEmptyNode } from '../../utils/isEmptyNode'
import { useFieldContext } from '../Field'
import { CheckboxGroupContext } from './CheckboxGroupContext'
import { checkboxVariants } from './variants'

export type CheckboxProps = CheckboxPrimitive.Root.Props &
  RefAttributes<HTMLElement> & {
    label?: ReactNode
    description?: ReactNode
    /** Ignored inside a `CheckboxGroup`, which sets it for every item. */
    emphasis?: 'subtler' | 'normal'
    invalid?: boolean
  }

export function Checkbox({
  className,
  label,
  description,
  emphasis: emphasisProp,
  invalid: invalidProp,
  required: requiredProp,
  disabled: disabledProp,
  id,
  children,
  ...props
}: CheckboxProps) {
  const group = use(CheckboxGroupContext)
  const field = useFieldContext()
  // A group takes the Field's wiring for itself, so its items stay out of it.
  const inField = !group && !!field.fieldId

  const emphasis = group?.emphasis ?? emphasisProp ?? 'subtler'
  const invalid = invalidProp ?? (inField ? field.invalid : undefined)
  const required = requiredProp ?? (inField ? field.required : undefined)
  const disabled = disabledProp ?? (inField ? field.disabled : undefined)
  const fieldTextId = invalid ? field.errorTextId : field.helperTextId
  const generatedId = useId()
  const hasLabel = !isEmptyNode(label)
  const hasDescription = !isEmptyNode(description)
  const labelId = hasLabel ? `${generatedId}-label` : undefined
  const descriptionId = hasDescription
    ? `${generatedId}-description`
    : undefined
  const describedBy =
    [descriptionId, inField && fieldTextId].filter(Boolean).join(' ') ||
    undefined

  const checkbox = (
    <CheckboxPrimitive.Root
      id={id ?? (inField ? field.fieldId : undefined)}
      required={required}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md border border-subtle emphasis-sunken outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] transition-[background-color,border-color,outline-width,outline-color] duration-moderate aria-[invalid=true]:border-[var(--color-danger-9)] aria-[invalid=true]:bg-[var(--color-danger-2)] aria-[invalid=true]:outline-[color-mix(in_oklch,var(--color-danger-9)_var(--focus-ring-opacity),transparent)] data-[checked]:border-[var(--color-accent-9)] data-[checked]:bg-[var(--color-accent-3)] data-[indeterminate]:border-[var(--color-accent-9)] data-[indeterminate]:bg-[var(--color-accent-3)]',
        emphasis !== 'normal' &&
          'focus-visible:outline-[length:var(--focus-ring-width)]'
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot='checkbox-indicator'
        className='flex text-[var(--color-accent-9)]'
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <MinusIcon weight='bold' className='size-4' />
            ) : (
              <CheckIcon weight='bold' className='size-4' />
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  )

  const text = (hasLabel || hasDescription) && (
    <span className='grid gap-0.5'>
      {hasLabel && (
        <span
          id={labelId}
          className={
            emphasis === 'normal'
              ? 'text-base font-medium text-normal'
              : 'text-sm text-normal'
          }
        >
          {label}
        </span>
      )}
      {hasDescription && (
        <span id={descriptionId} className='text-sm text-subtle'>
          {description}
        </span>
      )}
    </span>
  )

  return (
    <label
      data-slot='checkbox'
      className={cn(
        checkboxVariants({ emphasis, className }),
        group?.direction === 'horizontal' && emphasis === 'normal' && 'flex-1'
      )}
    >
      {emphasis === 'normal' ? (
        <>
          <span className='flex items-center gap-2'>
            {children}
            {text}
          </span>
          {checkbox}
        </>
      ) : (
        <>
          {checkbox}
          {children}
          {text}
        </>
      )}
    </label>
  )
}

Checkbox.displayName = 'Checkbox'
