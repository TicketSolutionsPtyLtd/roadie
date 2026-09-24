'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

import { ToastAction } from './ToastAction'
import { ToastClose } from './ToastClose'
import { ToastContent } from './ToastContent'
import { ToastDescription } from './ToastDescription'
import { ToastIcon } from './ToastIcon'
import { ToastRoot } from './ToastRoot'
import { ToastTitle } from './ToastTitle'

export type ToastViewportProps = ToastPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement> & {
    /** Where the viewport portals to. @default document.body */
    container?: ToastPrimitive.Portal.Props['container']
  }

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((toast) => (
    <ToastRoot key={toast.id} toast={toast}>
      <ToastContent>
        <ToastIcon />
        <div className='grid min-w-0 flex-1 gap-0.5'>
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </ToastRoot>
  ))
}

/**
 * The fixed region toasts stack in: bottom end on wider screens, full width
 * along the bottom on small ones. Renders every toast unless you pass children.
 */
export function ToastViewport({
  className,
  container,
  children,
  ...props
}: ToastViewportProps) {
  return (
    <ToastPrimitive.Portal container={container}>
      <ToastPrimitive.Viewport
        data-slot='toast-viewport'
        className={cn(
          'fixed inset-x-4 bottom-[max(--spacing(4),env(safe-area-inset-bottom))] z-toast outline-none',
          'sm:start-auto sm:end-6 sm:bottom-6 sm:w-sm',
          className
        )}
        {...props}
      >
        {children ?? <ToastList />}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

ToastViewport.displayName = 'Toast.Viewport'
