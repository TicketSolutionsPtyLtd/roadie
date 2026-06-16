import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type PopoverFooterProps = ComponentProps<'div'>

export function PopoverFooter({ className, ...props }: PopoverFooterProps) {
  return (
    <div
      data-slot='popover-footer'
      className={cn('flex justify-center gap-2', className)}
      {...props}
    />
  )
}

PopoverFooter.displayName = 'Popover.Footer'
