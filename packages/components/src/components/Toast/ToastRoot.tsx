'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

import { ToastTypeContext } from './ToastContext'
import { toastIntent, toastRootVariants } from './variants'

export type ToastRootProps = ToastPrimitive.Root.Props &
  RefAttributes<HTMLDivElement>

/** One toast. Its intent comes from the toast's `intent`, set when it was added. */
export function ToastRoot({ className, toast, ...props }: ToastRootProps) {
  return (
    <ToastTypeContext value={toast.type}>
      <ToastPrimitive.Root
        data-slot='toast'
        toast={toast}
        className={cn(
          toastRootVariants({ intent: toastIntent(toast.type) }),
          className
        )}
        {...props}
      />
    </ToastTypeContext>
  )
}

ToastRoot.displayName = 'Toast.Root'
