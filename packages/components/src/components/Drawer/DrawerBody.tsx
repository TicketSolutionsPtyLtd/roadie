'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerBodyProps = DrawerPrimitive.Content.Props &
  RefAttributes<HTMLDivElement>

// Base UI's `Content` part, so a drag that starts here scrolls, not dismisses.
export function DrawerBody({ className, ...props }: DrawerBodyProps) {
  return (
    <DrawerPrimitive.Content
      data-slot='drawer-body'
      className={cn(
        'grid min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain px-(--content-inset) py-2',
        className
      )}
      {...props}
    />
  )
}

DrawerBody.displayName = 'Drawer.Body'
