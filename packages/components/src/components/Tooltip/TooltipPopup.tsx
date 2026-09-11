'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

import { type TooltipEmphasis, tooltipPopupVariants } from './variants'

export type TooltipPopupProps = TooltipPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * `strong` is the high-contrast chip; `floating` matches Popover's surface
     * for a tooltip over dark content. The popup is portaled, so an intent
     * class must go on it directly to colour `strong`.
     *
     * @default 'strong'
     */
    emphasis?: TooltipEmphasis
  }

export function TooltipPopup({
  className,
  emphasis,
  ...props
}: TooltipPopupProps) {
  return (
    <TooltipPrimitive.Popup
      data-slot='tooltip-popup'
      className={cn(tooltipPopupVariants({ emphasis }), className)}
      {...props}
    />
  )
}

TooltipPopup.displayName = 'Tooltip.Popup'
