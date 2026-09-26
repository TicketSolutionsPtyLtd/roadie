'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

export type ToastTitleProps = ToastPrimitive.Title.Props &
  RefAttributes<HTMLHeadingElement>

/** Shows the toast's `title` unless you pass children. */
export function ToastTitle({ className, ...props }: ToastTitleProps) {
  return (
    <ToastPrimitive.Title
      data-slot='toast-title'
      className={cn('text-sm font-semibold text-strong', className)}
      {...props}
    />
  )
}

ToastTitle.displayName = 'Toast.Title'
