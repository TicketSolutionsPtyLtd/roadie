import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type DialogHeaderProps = ComponentProps<'div'>

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      data-slot='dialog-header'
      className={cn(
        // Centred stack; a leading IconTile (data-slot) is centred above
        // the title without affecting the text alignment.
        'relative grid gap-1.5 text-center [&>[data-slot=icon-tile]]:justify-self-center',
        className
      )}
      {...props}
    />
  )
}

DialogHeader.displayName = 'Dialog.Header'
