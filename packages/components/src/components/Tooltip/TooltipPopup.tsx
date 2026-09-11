'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

import { type TooltipEmphasis, tooltipPopupVariants } from './variants'

export type TooltipPopupProps = TooltipPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> & {
    /** Portaled, so colour `strong` with an intent class here. @default 'strong' */
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
