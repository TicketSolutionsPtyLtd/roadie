import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxChipLabelProps = ComponentProps<'span'>

export function ComboboxChipLabel({
  className,
  ...props
}: ComboboxChipLabelProps) {
  return (
    <span
      data-slot='combobox-chip-label'
      className={cn('min-w-0 truncate', className)}
      {...props}
    />
  )
}

ComboboxChipLabel.displayName = 'Combobox.ChipLabel'
