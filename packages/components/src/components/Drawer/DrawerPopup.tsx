'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { useDrawerSide } from './DrawerContext'
import { type DrawerSize, drawerPopupVariants } from './variants'

export type DrawerPopupProps = DrawerPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> & {
    /** The colour palette; inherited when unset. */
    intent?: RoadieIntent
    /**
     * Height for a bottom or top drawer, width for a side one.
     * @default 'md'
     */
    size?: DrawerSize
  }

export function DrawerPopup({
  className,
  intent,
  size,
  ...props
}: DrawerPopupProps) {
  const side = useDrawerSide()
  return (
    <DrawerPrimitive.Popup
      data-slot='drawer-popup'
      className={cn(drawerPopupVariants({ intent, side, size, className }))}
      {...props}
    />
  )
}

DrawerPopup.displayName = 'Drawer.Popup'
