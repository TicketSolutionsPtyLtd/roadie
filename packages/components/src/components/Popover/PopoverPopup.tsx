'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { triggerPrimaryActionOnEnter } from '../../utils/primaryAction'
import { popoverPopupVariants } from './variants'

export type PopoverPopupProps = PopoverPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof popoverPopupVariants>

export function PopoverPopup({
  className,
  intent,
  onKeyDown,
  ...props
}: PopoverPopupProps) {
  return (
    <PopoverPrimitive.Popup
      data-slot='popover-popup'
      className={cn(popoverPopupVariants({ intent, className }))}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        triggerPrimaryActionOnEnter(event)
      }}
      {...props}
    />
  )
}

PopoverPopup.displayName = 'Popover.Popup'
