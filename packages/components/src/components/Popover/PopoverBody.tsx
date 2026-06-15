import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type PopoverBodyProps = ComponentProps<'div'>

export function PopoverBody({ className, ...props }: PopoverBodyProps) {
  return (
    <div
      data-slot='popover-body'
      className={cn('grid gap-2', className)}
      {...props}
    />
  )
}

PopoverBody.displayName = 'Popover.Body'
