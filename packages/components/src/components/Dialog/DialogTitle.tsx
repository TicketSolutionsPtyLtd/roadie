'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

export type DialogTitleProps = DialogPrimitive.Title.Props &
  RefAttributes<HTMLHeadingElement>

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn('text-display-ui-4 text-strong', className)}
      {...props}
    />
  )
}

DialogTitle.displayName = 'Dialog.Title'
