import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerFooterProps = ComponentProps<'div'>

export function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return (
    <div
      data-slot='drawer-footer'
      className={cn(
        // Clears the home indicator on a bottom sheet.
        'relative flex shrink-0 flex-wrap items-center justify-end gap-2 px-(--content-inset) pt-2 pb-[max(var(--spacing)*4,env(safe-area-inset-bottom))]',
        // Flipped so the token shadow falls upward, over rows scrolled under the footer.
        "after:pointer-events-none after:absolute after:inset-0 after:-scale-y-100 after:opacity-0 after:shadow-md after:content-['']",
        '[[data-slot=drawer-popup]:has([data-slot=drawer-body][data-overflow-y-end])_&]:after:opacity-100',
        'motion-safe:after:transition-opacity motion-safe:after:duration-slow motion-safe:after:ease-enter',
        'motion-reduce:after:transition-none',
        className
      )}
      {...props}
    />
  )
}

DrawerFooter.displayName = 'Drawer.Footer'
