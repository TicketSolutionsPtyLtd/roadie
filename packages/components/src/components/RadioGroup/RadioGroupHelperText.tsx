import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type RadioGroupHelperTextProps = ComponentProps<'p'>

export function RadioGroupHelperText({
  className,
  ...props
}: RadioGroupHelperTextProps) {
  return (
    <p
      data-slot='radio-group-helper-text'
      className={cn('w-full text-sm text-subtle', className)}
      {...props}
    />
  )
}

RadioGroupHelperText.displayName = 'RadioGroup.HelperText'
