'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

export type DialogCloseProps = DialogPrimitive.Close.Props &
  RefAttributes<HTMLButtonElement>

export function DialogClose({ className, ...props }: DialogCloseProps) {
  return (
    <DialogPrimitive.Close
      data-slot='dialog-close'
      className={className}
      {...props}
    />
  )
}

DialogClose.displayName = 'Dialog.Close'
