'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

export type DrawerCloseProps = DrawerPrimitive.Close.Props &
  RefAttributes<HTMLButtonElement>

export function DrawerClose({ className, ...props }: DrawerCloseProps) {
  return (
    <DrawerPrimitive.Close
      data-slot='drawer-close'
      className={className}
      {...props}
    />
  )
}

DrawerClose.displayName = 'Drawer.Close'
