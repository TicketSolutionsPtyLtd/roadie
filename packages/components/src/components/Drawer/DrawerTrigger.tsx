'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

export type DrawerTriggerProps = DrawerPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function DrawerTrigger({ className, ...props }: DrawerTriggerProps) {
  return (
    <DrawerPrimitive.Trigger
      data-slot='drawer-trigger'
      className={className}
      {...props}
    />
  )
}

DrawerTrigger.displayName = 'Drawer.Trigger'
