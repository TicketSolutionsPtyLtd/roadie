'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

import { useDialogRole } from './DialogContext'

export type DialogBackdropProps = DialogPrimitive.Backdrop.Props &
  RefAttributes<HTMLDivElement>

export function DialogBackdrop({ className, ...props }: DialogBackdropProps) {
  const role = useDialogRole()
  return (
    <DialogPrimitive.Backdrop
      data-slot='dialog-backdrop'
      className={cn(
        'fixed inset-0 emphasis-overlay transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        role === 'alertdialog' ? 'z-alert' : 'z-overlay',
        className
      )}
      {...props}
    />
  )
}

DialogBackdrop.displayName = 'Dialog.Backdrop'
