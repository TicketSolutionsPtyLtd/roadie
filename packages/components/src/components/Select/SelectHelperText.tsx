import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type SelectHelperTextProps = ComponentProps<'p'>

export function SelectHelperText({
  className,
  ...props
}: SelectHelperTextProps) {
  return (
    <p
      data-slot='select-helper-text'
      className={cn('text-sm text-subtle', className)}
      {...props}
    />
  )
}

SelectHelperText.displayName = 'Select.HelperText'
