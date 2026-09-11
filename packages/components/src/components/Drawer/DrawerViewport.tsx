'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

import { useDrawerSide } from './DrawerContext'
import { drawerViewportVariants } from './variants'

export type DrawerViewportProps = DrawerPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement>

export function DrawerViewport({ className, ...props }: DrawerViewportProps) {
  const side = useDrawerSide()
  return (
    <DrawerPrimitive.Viewport
      data-slot='drawer-viewport'
      className={cn(drawerViewportVariants({ side, className }))}
      {...props}
    />
  )
}

DrawerViewport.displayName = 'Drawer.Viewport'
