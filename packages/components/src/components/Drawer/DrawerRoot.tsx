'use client'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import type { OverlayEmphasis } from '../../variants'
import { DrawerEmphasisContext, DrawerSideContext } from './DrawerContext'
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
  /**
   * How much the drawer takes over the page behind it. A small bottom or top
   * drawer defaults to `subtle`, because it peeks over its page; every other
   * drawer defaults to `normal`.
   */
  emphasis?: OverlayEmphasis
}

export function DrawerRoot({
  side = 'bottom',
  emphasis,
  ...props
}: DrawerRootProps) {
  return (
    <DrawerSideContext value={side}>
      <DrawerEmphasisContext value={emphasis}>
        <DrawerPrimitive.Root
          swipeDirection={DRAWER_SWIPE_DIRECTION[side]}
          {...props}
        />
      </DrawerEmphasisContext>
    </DrawerSideContext>
  )
}

DrawerRoot.displayName = 'Drawer.Root'
