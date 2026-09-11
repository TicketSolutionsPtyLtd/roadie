'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

export type DrawerDescriptionProps = DrawerPrimitive.Description.Props &
  RefAttributes<HTMLParagraphElement>

export function DrawerDescription({
  className,
  ...props
}: DrawerDescriptionProps) {
  return (
    <DrawerPrimitive.Description
      data-slot='drawer-description'
      className={cn('text-subtle', className)}
      {...props}
    />
  )
}

DrawerDescription.displayName = 'Drawer.Description'
