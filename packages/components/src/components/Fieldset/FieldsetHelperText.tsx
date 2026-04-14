'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type FieldsetHelperTextProps = ComponentProps<'p'>

export function FieldsetHelperText({
  className,
  ...props
}: FieldsetHelperTextProps) {
  return <p className={cn('text-sm text-subtle', className)} {...props} />
}

FieldsetHelperText.displayName = 'Fieldset.HelperText'
