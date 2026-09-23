'use client'

import { useMemo, useState } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import type { OverlayEmphasis } from '../../variants'
import {
  DrawerEmphasisContext,
  DrawerSideContext,
  DrawerSizeContext
} from './DrawerContext'
import {
  DRAWER_SWIPE_DIRECTION,
  type DrawerSide,
  type DrawerSize
} from './variants'

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
  const [size, setSize] = useState<DrawerSize | undefined>(undefined)
  const sizeContext = useMemo(() => ({ size, setSize }), [size])
  return (
    <DrawerSideContext value={side}>
      <DrawerEmphasisContext value={emphasis}>
        <DrawerSizeContext value={sizeContext}>
          <DrawerPrimitive.Root
            swipeDirection={DRAWER_SWIPE_DIRECTION[side]}
            {...props}
          />
        </DrawerSizeContext>
      </DrawerEmphasisContext>
    </DrawerSideContext>
  )
}

DrawerRoot.displayName = 'Drawer.Root'
