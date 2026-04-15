'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldContext } from './FieldContext'

export type FieldHelperTextProps = ComponentProps<'p'>

export function FieldHelperText({
  id,
  className,
  ...props
}: FieldHelperTextProps) {
  const { helperTextId } = use(FieldContext)
  return (
    <p
      id={id ?? (helperTextId || undefined)}
      data-slot='field-helper-text'
      className={cn('text-sm text-subtle', className)}
      {...props}
    />
  )
}

FieldHelperText.displayName = 'Field.HelperText'
