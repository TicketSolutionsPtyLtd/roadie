import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type PopoverHeaderProps = ComponentProps<'div'>

export function PopoverHeader({ className, ...props }: PopoverHeaderProps) {
  return (
    <div
      data-slot='popover-header'
      className={cn('grid gap-1 text-center', className)}
      {...props}
    />
  )
}

PopoverHeader.displayName = 'Popover.Header'
