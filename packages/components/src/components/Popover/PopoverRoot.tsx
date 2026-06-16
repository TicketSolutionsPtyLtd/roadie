'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

export type PopoverRootProps = PopoverPrimitive.Root.Props

export function PopoverRoot(props: PopoverRootProps) {
  return <PopoverPrimitive.Root {...props} />
}

PopoverRoot.displayName = 'Popover.Root'
