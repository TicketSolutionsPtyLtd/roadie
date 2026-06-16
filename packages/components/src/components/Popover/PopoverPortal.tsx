'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

export type PopoverPortalProps = PopoverPrimitive.Portal.Props

export function PopoverPortal(props: PopoverPortalProps) {
  return <PopoverPrimitive.Portal {...props} />
}

PopoverPortal.displayName = 'Popover.Portal'
