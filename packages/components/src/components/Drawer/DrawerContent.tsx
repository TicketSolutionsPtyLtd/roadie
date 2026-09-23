'use client'

import { DrawerBackdrop } from './DrawerBackdrop'
import { useDrawerSide } from './DrawerContext'
import { DrawerHandle } from './DrawerHandle'
import { DrawerPopup, type DrawerPopupProps } from './DrawerPopup'
import { DrawerPortal } from './DrawerPortal'
import { DrawerViewport } from './DrawerViewport'

export type DrawerContentProps = DrawerPopupProps & {
  /** Renders the grab handle; on by default for bottom and top drawers. */
  handle?: boolean
}

export function DrawerContent({
  children,
  handle,
  ...props
}: DrawerContentProps) {
  const side = useDrawerSide()
  const edgeSheet = side === 'bottom' || side === 'top'
  const showHandle = handle ?? edgeSheet
  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DrawerViewport>
        <DrawerPopup {...props}>
          {/* The handle sits on the swipe edge: the far one for a top drawer. */}
          {showHandle && side !== 'top' && <DrawerHandle />}
          {children}
          {showHandle && side === 'top' && <DrawerHandle />}
        </DrawerPopup>
      </DrawerViewport>
    </DrawerPortal>
  )
}

DrawerContent.displayName = 'Drawer.Content'
