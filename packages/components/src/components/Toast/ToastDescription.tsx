'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

export type ToastDescriptionProps = ToastPrimitive.Description.Props &
  RefAttributes<HTMLParagraphElement>

/** Shows the toast's `description` unless you pass children. */
export function ToastDescription({
  className,
  ...props
}: ToastDescriptionProps) {
  return (
    <ToastPrimitive.Description
      data-slot='toast-description'
      className={cn('text-sm text-pretty text-subtle', className)}
      {...props}
    />
  )
}

ToastDescription.displayName = 'Toast.Description'
