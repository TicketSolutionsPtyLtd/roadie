'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

export type DialogDescriptionProps = DialogPrimitive.Description.Props &
  RefAttributes<HTMLParagraphElement>

export function DialogDescription({
  className,
  ...props
}: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={cn('text-subtle', className)}
      {...props}
    />
  )
}

DialogDescription.displayName = 'Dialog.Description'
