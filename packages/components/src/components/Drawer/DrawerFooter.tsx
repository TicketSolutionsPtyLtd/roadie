import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerFooterProps = ComponentProps<'div'>

export function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return (
    <div
      data-slot='drawer-footer'
      className={cn(
        // Clears the home indicator on a bottom sheet.
        'flex shrink-0 flex-wrap items-center justify-end gap-2 px-(--content-inset) pt-2 pb-[max(var(--spacing)*4,env(safe-area-inset-bottom))]',
        className
      )}
      {...props}
    />
  )
}

DrawerFooter.displayName = 'Drawer.Footer'
