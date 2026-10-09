'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type PopoverPortalProps = PopoverPrimitive.Portal.Props

export function PopoverPortal(props: PopoverPortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <PopoverPrimitive.Portal {...props} {...scope} />
}

PopoverPortal.displayName = 'Popover.Portal'
