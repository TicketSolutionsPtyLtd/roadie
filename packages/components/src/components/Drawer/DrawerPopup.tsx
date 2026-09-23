'use client'

import { type RefAttributes, use, useLayoutEffect } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { DrawerSizeContext, useDrawerSide } from './DrawerContext'
import { type DrawerSize, drawerPopupVariants } from './variants'

export type DrawerPopupProps = DrawerPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> & {
    /** The colour palette; inherited when unset. */
    intent?: RoadieIntent
    /**
     * Height for a bottom or top drawer, width for a side one. `sm`, `md` and `lg` are fixed; `fit` follows the content. Defaults to `fit` on the top or bottom, `md` on a side.
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
  const resolvedSize =
    size ?? (side === 'left' || side === 'right' ? 'md' : 'fit')
  const { setSize } = use(DrawerSizeContext)
  useLayoutEffect(() => setSize(resolvedSize), [setSize, resolvedSize])
  return (
    <DrawerPrimitive.Popup
      data-slot='drawer-popup'
      data-size={resolvedSize}
      className={cn(
        drawerPopupVariants({ intent, side, size: resolvedSize, className })
      )}
      {...props}
    />
  )
}

DrawerPopup.displayName = 'Drawer.Popup'
