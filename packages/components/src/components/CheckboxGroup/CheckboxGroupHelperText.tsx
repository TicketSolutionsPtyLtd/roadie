import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CheckboxGroupHelperTextProps = ComponentProps<'p'>

export function CheckboxGroupHelperText({
  className,
  ...props
}: CheckboxGroupHelperTextProps) {
  return (
    <p
      data-slot='checkbox-group-helper-text'
      className={cn('w-full text-sm text-subtle', className)}
      {...props}
    />
  )
}

CheckboxGroupHelperText.displayName = 'CheckboxGroup.HelperText'
