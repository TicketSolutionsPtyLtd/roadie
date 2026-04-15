'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldContext } from './FieldContext'

export type FieldErrorTextProps = ComponentProps<'p'>

export function FieldErrorText({
  id,
  className,
  ...props
}: FieldErrorTextProps) {
  const { invalid, errorTextId } = use(FieldContext)
  if (!invalid) return null
  return (
    <p
      id={id ?? (errorTextId || undefined)}
      role='alert'
      data-slot='field-error-text'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

FieldErrorText.displayName = 'Field.ErrorText'
