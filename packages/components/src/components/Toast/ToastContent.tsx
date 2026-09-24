'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

export type ToastContentProps = ToastPrimitive.Content.Props &
  RefAttributes<HTMLDivElement>

/** Lays out a toast's parts in a row. Fades out while stacked behind the front toast. */
export function ToastContent({ className, ...props }: ToastContentProps) {
  return (
    <ToastPrimitive.Content
      data-slot='toast-content'
      className={cn(
        'flex h-full items-center gap-3 overflow-hidden py-3 ps-4 pe-3',
        'transition-opacity duration-moderate data-[behind]:opacity-0 data-[expanded]:opacity-100',
        className
      )}
      {...props}
    />
  )
}

ToastContent.displayName = 'Toast.Content'
