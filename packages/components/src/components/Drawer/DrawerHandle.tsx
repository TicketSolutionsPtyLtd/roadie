import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerHandleProps = ComponentProps<'div'>

// A visual hint only: the whole surface takes the swipe, not this element.
export function DrawerHandle({ className, ...props }: DrawerHandleProps) {
  return (
    <div
      data-slot='drawer-handle'
      aria-hidden='true'
      className={cn(
        'mx-auto my-2 h-1 w-9 shrink-0 rounded-full bg-(--intent-border-subtle)',
        className
      )}
      {...props}
    />
  )
}

DrawerHandle.displayName = 'Drawer.Handle'
