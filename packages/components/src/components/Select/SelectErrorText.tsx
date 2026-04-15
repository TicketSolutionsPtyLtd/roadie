'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { SelectContext } from './SelectContext'

export type SelectErrorTextProps = ComponentProps<'p'>

export function SelectErrorText({ className, ...props }: SelectErrorTextProps) {
  const { invalid } = use(SelectContext)
  if (!invalid) return null
  return (
    <p
      role='alert'
      data-slot='select-error-text'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

SelectErrorText.displayName = 'Select.ErrorText'
