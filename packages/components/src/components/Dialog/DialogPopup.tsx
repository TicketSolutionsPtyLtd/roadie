'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { triggerPrimaryActionOnEnter } from '../../utils/primaryAction'
import { dialogPopupVariants } from './variants'

export type DialogPopupProps = DialogPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof dialogPopupVariants>

export function DialogPopup({
  className,
  intent,
  size,
  onKeyDown,
  ...props
}: DialogPopupProps) {
  return (
    <DialogPrimitive.Popup
      data-slot='dialog-popup'
      className={cn(dialogPopupVariants({ intent, size, className }))}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        triggerPrimaryActionOnEnter(event)
      }}
      {...props}
    />
  )
}

DialogPopup.displayName = 'Dialog.Popup'
