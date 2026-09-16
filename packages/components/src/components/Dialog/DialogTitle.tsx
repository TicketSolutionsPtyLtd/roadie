'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

import { surfaceTitleClass } from '../../variants'

export type DialogTitleProps = DialogPrimitive.Title.Props &
  RefAttributes<HTMLHeadingElement>

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn(surfaceTitleClass, className)}
      {...props}
    />
  )
}

DialogTitle.displayName = 'Dialog.Title'
