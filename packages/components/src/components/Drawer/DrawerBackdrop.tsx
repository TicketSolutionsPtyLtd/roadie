'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerBackdropProps = DrawerPrimitive.Backdrop.Props &
  RefAttributes<HTMLDivElement>

export function DrawerBackdrop({ className, ...props }: DrawerBackdropProps) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot='drawer-backdrop'
      className={cn(
        'fixed inset-0 z-overlay emphasis-overlay',
        // Fades with the live swipe, not only on release.
        'opacity-[calc(1_-_var(--drawer-swipe-progress,0))]',
        'transition-opacity duration-slow ease-enter',
        'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

DrawerBackdrop.displayName = 'Drawer.Backdrop'
