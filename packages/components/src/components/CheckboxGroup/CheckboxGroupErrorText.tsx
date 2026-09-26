'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { CheckboxGroupContext } from '../Checkbox/CheckboxGroupContext'

export type CheckboxGroupErrorTextProps = ComponentProps<'p'>

export function CheckboxGroupErrorText({
  className,
  ...props
}: CheckboxGroupErrorTextProps) {
  if (!use(CheckboxGroupContext)?.invalid) return null
  return (
    <p
      role='alert'
      data-slot='checkbox-group-error-text'
      className={cn('w-full text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

CheckboxGroupErrorText.displayName = 'CheckboxGroup.ErrorText'
