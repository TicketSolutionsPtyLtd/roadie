'use client'

import type { ReactNode, RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

import { KbdShortcut, hasShortcut } from '../Kbd/KbdShortcut'
import { type TooltipEmphasis, tooltipPopupVariants } from './variants'

export type TooltipPopupProps = TooltipPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> & {
    /** Portaled, so colour `strong` with an intent class here. @default 'strong' */
    emphasis?: TooltipEmphasis
    /** Keys such as `['mod', 's']`, shown per platform after the label. Visual only: put `aria-keyshortcuts` on the trigger. */
    shortcut?: ReactNode
  }

export function TooltipPopup({
  className,
  emphasis,
  shortcut,
  children,
  ...props
}: TooltipPopupProps) {
  const withShortcut = hasShortcut(shortcut)
  return (
    <TooltipPrimitive.Popup
      data-slot='tooltip-popup'
      className={cn(
        tooltipPopupVariants({ emphasis }),
        withShortcut ? 'flex items-center gap-2' : undefined,
        className
      )}
      {...props}
    >
      {children}
      {withShortcut ? (
        <KbdShortcut
          shortcut={shortcut}
          size='sm'
          data-slot='tooltip-shortcut'
        />
      ) : null}
    </TooltipPrimitive.Popup>
  )
}

TooltipPopup.displayName = 'Tooltip.Popup'
