'use client'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

export type DrawerPortalProps = DrawerPrimitive.Portal.Props

export function DrawerPortal(props: DrawerPortalProps) {
  return <DrawerPrimitive.Portal {...props} />
}

DrawerPortal.displayName = 'Drawer.Portal'
