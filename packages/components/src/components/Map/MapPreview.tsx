'use client'

import type { ReactNode } from 'react'

import { Popover } from '../Popover'
import { useMapContext } from './MapContext'

type MapPreviewProps = {
  /** Gap between the pin or label and the preview, in px. */
  sideOffset: number
  /** Closes the preview. */
  onClose: () => void
  children?: ReactNode
}

/**
 * A pin's or area's preview, above it. While the map fills the window it
 * portals inside the map, so it shows there and Tab reaches it.
 */
export function MapPreview({ sideOffset, onClose, children }: MapPreviewProps) {
  const { portalContainer } = useMapContext('Map preview')
  return (
    <Popover.Portal container={portalContainer ?? undefined}>
      <Popover.Positioner side='top' sideOffset={sideOffset}>
        <Popover.Popup
          // Using a button or link in the preview, such as one that opens a
          // dialog, is done with the preview, as a menu closes on a choice.
          onClick={(event) => {
            const target = event.target as Element
            if (target.closest('button, a[href]')) onClose()
          }}
        >
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )
}
