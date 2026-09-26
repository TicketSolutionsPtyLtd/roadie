'use client'

import { PopoverPopup, type PopoverPopupProps } from './PopoverPopup'
import { PopoverPortal } from './PopoverPortal'
import {
  PopoverPositioner,
  type PopoverPositionerProps
} from './PopoverPositioner'

type PlacementKey = 'side' | 'align' | 'sideOffset' | 'alignOffset'

export type PopoverContentProps = PopoverPopupProps & {
  /** @default 'bottom' */
  side?: 'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end'
  /** @default 'center' */
  align?: 'start' | 'center' | 'end'
  /** Gap between trigger and popover, in px. @default 8 */
  sideOffset?: number
  /** Shift along the trigger's edge, in px. @default 0 */
  alignOffset?: number
  /** Props forwarded to the underlying Positioner. */
  positionerProps?: Omit<PopoverPositionerProps, PlacementKey> & {
    /** @deprecated Pass `side` to `Popover.Content` instead. */
    side?: PopoverPositionerProps['side']
    /** @deprecated Pass `align` to `Popover.Content` instead. */
    align?: PopoverPositionerProps['align']
    /** @deprecated Pass `sideOffset` to `Popover.Content` instead. */
    sideOffset?: PopoverPositionerProps['sideOffset']
    /** @deprecated Pass `alignOffset` to `Popover.Content` instead. */
    alignOffset?: PopoverPositionerProps['alignOffset']
  }
}

export function PopoverContent({
  side,
  align,
  sideOffset,
  alignOffset,
  positionerProps,
  children,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPortal>
      <PopoverPositioner
        {...positionerProps}
        side={side ?? positionerProps?.side}
        align={align ?? positionerProps?.align}
        sideOffset={sideOffset ?? positionerProps?.sideOffset}
        alignOffset={alignOffset ?? positionerProps?.alignOffset}
      >
        <PopoverPopup {...props}>{children}</PopoverPopup>
      </PopoverPositioner>
    </PopoverPortal>
  )
}

PopoverContent.displayName = 'Popover.Content'
