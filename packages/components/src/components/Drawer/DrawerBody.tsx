'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'

export type DrawerBodyProps = DrawerPrimitive.Content.Props &
  RefAttributes<HTMLDivElement>

// Base UI's `Content` is the viewport that scrolls, so a drag that starts here scrolls, not dismisses.
export function DrawerBody({ className, children, ...props }: DrawerBodyProps) {
  return (
    <ScrollArea className='grid flex-1'>
      <ScrollArea.Viewport
        render={<DrawerPrimitive.Content data-slot='drawer-body' {...props} />}
      >
        <ScrollArea.Content
          fitWidth={false}
          className={cn('grid gap-3 px-(--content-inset) py-2', className)}
        >
          {children}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}

DrawerBody.displayName = 'Drawer.Body'
