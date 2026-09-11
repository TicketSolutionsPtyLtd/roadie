import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerHeaderProps = ComponentProps<'div'>

export function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return (
    <div
      data-slot='drawer-header'
      className={cn(
        // Leading-aligned, unlike `Dialog.Header`: a drawer is read down.
        'grid shrink-0 gap-1.5 px-(--content-inset) pt-4 pb-2',
        className
      )}
      {...props}
    />
  )
}

DrawerHeader.displayName = 'Drawer.Header'
