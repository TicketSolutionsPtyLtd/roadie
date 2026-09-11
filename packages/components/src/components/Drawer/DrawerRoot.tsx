'use client'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { DrawerSideContext } from './DrawerContext'
import { DRAWER_SWIPE_DIRECTION, type DrawerSide } from './variants'

export type DrawerRootProps = Omit<
  DrawerPrimitive.Root.Props,
  'swipeDirection'
> & {
  /**
   * The edge the drawer is anchored to, which also sets the swipe direction.
   * @default 'bottom'
   */
  side?: DrawerSide
}

export function DrawerRoot({ side = 'bottom', ...props }: DrawerRootProps) {
  return (
    <DrawerSideContext value={side}>
      <DrawerPrimitive.Root
        swipeDirection={DRAWER_SWIPE_DIRECTION[side]}
        {...props}
      />
    </DrawerSideContext>
  )
}

DrawerRoot.displayName = 'Drawer.Root'
