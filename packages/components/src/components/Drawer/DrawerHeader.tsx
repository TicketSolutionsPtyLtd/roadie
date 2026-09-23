import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerHeaderProps = ComponentProps<'div'>

export function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  return (
    <div
      data-slot='drawer-header'
      className={cn(
        // Leading-aligned, unlike `Dialog.Header`: a drawer is read down.
        'relative z-1 grid shrink-0 gap-1.5 px-(--content-inset) pt-4 pb-2',
        // Shadows the body once it scrolls up under the header.
        "after:pointer-events-none after:absolute after:inset-0 after:opacity-0 after:shadow-md after:content-[''] after:[clip-path:inset(0_0_-1rem_0)]",
        '[[data-slot=drawer-popup]:has([data-slot=drawer-body][data-overflow-y-start])_&]:after:opacity-100',
        'motion-safe:after:transition-opacity motion-safe:after:duration-slow motion-safe:after:ease-enter',
        'motion-reduce:after:transition-none',
        // A Close takes the top-left corner above the title, as it does in a Pane, wherever it's written.
        '[&>[data-slot=drawer-close]]:row-start-1 [&>[data-slot=drawer-close]]:mb-2 [&>[data-slot=drawer-close]]:justify-self-start',
        // Close sits as far from the top edge as from the side; a leading handle takes --spacing(5) of that, whatever wraps the header.
        'has-[>[data-slot=drawer-close]]:pt-(--content-inset)',
        '[[data-slot=drawer-popup]:has(>[data-slot=drawer-handle]:first-child)_&]:has-[>[data-slot=drawer-close]]:pt-[calc(var(--content-inset)-var(--spacing)*5)]',
        className
      )}
      {...props}
    />
  )
}

DrawerHeader.displayName = 'Drawer.Header'
