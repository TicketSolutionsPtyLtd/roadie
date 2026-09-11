'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerSwipeAreaProps = DrawerPrimitive.SwipeArea.Props &
  RefAttributes<HTMLDivElement>

/** An unpositioned, invisible strip that opens the drawer on a swipe. */
export function DrawerSwipeArea({ className, ...props }: DrawerSwipeAreaProps) {
  return (
    <DrawerPrimitive.SwipeArea
      data-slot='drawer-swipe-area'
      className={cn('touch-none', className)}
      {...props}
    />
  )
}

DrawerSwipeArea.displayName = 'Drawer.SwipeArea'
