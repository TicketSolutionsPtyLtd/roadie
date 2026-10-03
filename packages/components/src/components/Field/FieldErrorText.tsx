'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldContext, FieldControlErrorContext } from './FieldContext'

export type FieldErrorTextProps = ComponentProps<'p'>

/**
 * Shows when the field is invalid, or when its control can't read what was
 * typed. The control's message, such as a date it can't read, wins over
 * `children`, since it says exactly what to fix.
 */
export function FieldErrorText({
  id,
  className,
  children,
  ...props
}: FieldErrorTextProps) {
  const { invalid, errorTextId } = use(FieldContext)
  const { controlError } = use(FieldControlErrorContext)
  if (!invalid && !controlError) return null
  return (
    <p
      id={id ?? (errorTextId || undefined)}
      role='alert'
      data-slot='field-error-text'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    >
      {controlError ?? children}
    </p>
  )
}

FieldErrorText.displayName = 'Field.ErrorText'
