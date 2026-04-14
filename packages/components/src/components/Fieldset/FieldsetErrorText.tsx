'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldsetContext } from './FieldsetContext'

export type FieldsetErrorTextProps = ComponentProps<'p'>

export function FieldsetErrorText({
  className,
  ...props
}: FieldsetErrorTextProps) {
  const { invalid } = use(FieldsetContext)
  if (!invalid) return null
  return (
    <p
      role='alert'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

FieldsetErrorText.displayName = 'Fieldset.ErrorText'
