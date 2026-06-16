'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

export type DialogBackdropProps = DialogPrimitive.Backdrop.Props &
  RefAttributes<HTMLDivElement>

export function DialogBackdrop({ className, ...props }: DialogBackdropProps) {
  return (
    <DialogPrimitive.Backdrop
      data-slot='dialog-backdrop'
      className={cn(
        'fixed inset-0 z-overlay emphasis-overlay transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

DialogBackdrop.displayName = 'Dialog.Backdrop'
