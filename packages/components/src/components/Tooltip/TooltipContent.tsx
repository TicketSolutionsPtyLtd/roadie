'use client'

import { TooltipPopup, type TooltipPopupProps } from './TooltipPopup'
import { TooltipPortal } from './TooltipPortal'
import { TooltipPositioner } from './TooltipPositioner'
import type { TooltipSide } from './variants'

export type TooltipContentProps = TooltipPopupProps & {
  /** @default 'top' */
  side?: TooltipSide
  /** @default 'center' */
  align?: 'start' | 'center' | 'end'
  /** Gap between trigger and tooltip, in px. @default 6 */
  sideOffset?: number
  /** Shift along the trigger's edge, in px. @default 0 */
  alignOffset?: number
}

export function TooltipContent({
  side,
  align,
  sideOffset,
  alignOffset,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPortal>
      <TooltipPositioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
      >
        <TooltipPopup {...props}>{children}</TooltipPopup>
      </TooltipPositioner>
    </TooltipPortal>
  )
}

TooltipContent.displayName = 'Tooltip.Content'
