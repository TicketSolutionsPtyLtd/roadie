'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RadioGroupContext } from './RadioGroupContext'

export type RadioGroupErrorTextProps = ComponentProps<'p'>

export function RadioGroupErrorText({
  className,
  ...props
}: RadioGroupErrorTextProps) {
  const { invalid } = use(RadioGroupContext)
  if (!invalid) return null
  return (
    <p
      role='alert'
      data-slot='radio-group-error-text'
      className={cn('w-full text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

RadioGroupErrorText.displayName = 'RadioGroup.ErrorText'
