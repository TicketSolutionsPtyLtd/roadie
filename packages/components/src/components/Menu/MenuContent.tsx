'use client'

import { MenuPopup, type MenuPopupProps } from './MenuPopup'
import { MenuPortal } from './MenuPortal'
import { MenuPositioner } from './MenuPositioner'

export type MenuContentProps = MenuPopupProps & {
  /** @default 'bottom', or 'inline-end' in a submenu */
  side?: 'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end'
  /** @default 'start' */
  align?: 'start' | 'center' | 'end'
  /** Gap between trigger and menu, in px. @default 8, or 4 in a submenu */
  sideOffset?: number
  /** Shift along the trigger's edge, in px. @default 0, or -4 in a submenu */
  alignOffset?: number
}

export function MenuContent({
  side,
  align,
  sideOffset,
  alignOffset,
  children,
  ...props
}: MenuContentProps) {
  return (
    <MenuPortal>
      <MenuPositioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
      >
        <MenuPopup {...props}>{children}</MenuPopup>
      </MenuPositioner>
    </MenuPortal>
  )
}

MenuContent.displayName = 'Menu.Content'
