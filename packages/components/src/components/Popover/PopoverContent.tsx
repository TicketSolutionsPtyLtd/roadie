'use client'

import { PopoverPopup, type PopoverPopupProps } from './PopoverPopup'
import { PopoverPortal } from './PopoverPortal'
import {
  PopoverPositioner,
  type PopoverPositionerProps
} from './PopoverPositioner'

export type PopoverContentProps = PopoverPopupProps & {
  /** Props forwarded to the underlying Positioner (side, align, sideOffset). */
  positionerProps?: PopoverPositionerProps
}

export function PopoverContent({
  children,
  positionerProps,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPortal>
      <PopoverPositioner {...positionerProps}>
        <PopoverPopup {...props}>{children}</PopoverPopup>
      </PopoverPositioner>
    </PopoverPortal>
  )
}

PopoverContent.displayName = 'Popover.Content'
