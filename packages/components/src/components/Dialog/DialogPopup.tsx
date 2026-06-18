'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { triggerPrimaryActionOnEnter } from '../../utils/primaryAction'
import { useDialogRole } from './DialogContext'
import { dialogPopupVariants } from './variants'

export type DialogPopupProps = DialogPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof dialogPopupVariants>

export function DialogPopup({
  className,
  intent,
  size,
  role,
  onKeyDown,
  ...props
}: DialogPopupProps) {
  const contextRole = useDialogRole()
  const resolvedRole =
    role ?? (contextRole === 'alertdialog' ? 'alertdialog' : undefined)
  return (
    <DialogPrimitive.Popup
      data-slot='dialog-popup'
      // Forwarding role={undefined} would clobber Base UI's default 'dialog'.
      {...(resolvedRole ? { role: resolvedRole } : {})}
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
