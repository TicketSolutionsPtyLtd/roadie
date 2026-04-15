import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type FieldsetHelperTextProps = ComponentProps<'p'>

export function FieldsetHelperText({
  className,
  ...props
}: FieldsetHelperTextProps) {
  return (
    <p
      data-slot='fieldset-helper-text'
      className={cn('text-sm text-subtle', className)}
      {...props}
    />
  )
}

FieldsetHelperText.displayName = 'Fieldset.HelperText'
