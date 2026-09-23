'use client'

import { DrawerBackdrop } from './DrawerBackdrop'
import {
  DrawerEmphasisContext,
  useDrawerEmphasis,
  useDrawerSide
} from './DrawerContext'
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
  const peeks = edgeSheet && props.size === 'sm'
  const emphasis = useDrawerEmphasis() ?? (peeks ? 'subtle' : 'normal')
  return (
    <DrawerPortal>
      <DrawerEmphasisContext value={emphasis}>
        <DrawerBackdrop />
      </DrawerEmphasisContext>
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
