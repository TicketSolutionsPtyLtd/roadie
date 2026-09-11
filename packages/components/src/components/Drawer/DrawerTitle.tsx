'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

import { surfaceTitleClass } from '../../variants'

export type DrawerTitleProps = DrawerPrimitive.Title.Props &
  RefAttributes<HTMLHeadingElement>

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <DrawerPrimitive.Title
      data-slot='drawer-title'
      className={cn(surfaceTitleClass, className)}
      {...props}
    />
  )
}

DrawerTitle.displayName = 'Drawer.Title'
