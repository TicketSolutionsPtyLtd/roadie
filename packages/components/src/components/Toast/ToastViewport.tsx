'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

import { ToastAction } from './ToastAction'
import { ToastClose } from './ToastClose'
import { ToastContent } from './ToastContent'
import { ToastPositionContext } from './ToastContext'
import { ToastDescription } from './ToastDescription'
import { ToastIcon } from './ToastIcon'
import { ToastRoot } from './ToastRoot'
import { ToastTitle } from './ToastTitle'
import { toastSide, toastViewportVariants } from './variants'

export type ToastViewportProps = ToastPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement> & {
    /** Where the viewport portals to. @default document.body */
    container?: ToastPrimitive.Portal.Props['container']
    /**
     * The edge toasts stack at, set once for the whole app. `end` follows the
     * reading direction. Small screens always span the chosen edge.
     * @default 'bottom-end'
     */
    position?: 'bottom-end' | 'bottom-center' | 'top-end' | 'top-center'
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
 * The fixed region toasts stack in, at `position` on wider screens and full
 * width along the same edge on small ones. Set `--toast-viewport-offset-bottom`
 * (or `-top`) on it or an ancestor to clear fixed UI. Renders every toast
 * unless you pass children.
 */
export function ToastViewport({
  className,
  container,
  position = 'bottom-end',
  children,
  ...props
}: ToastViewportProps) {
  return (
    <ToastPositionContext value={position}>
      <ToastPrimitive.Portal container={container}>
        <ToastPrimitive.Viewport
          data-slot='toast-viewport'
          data-position={position}
          className={cn(
            toastViewportVariants({
              side: toastSide(position),
              align: position.endsWith('center') ? 'center' : 'end'
            }),
            className
          )}
          {...props}
        >
          {children ?? <ToastList />}
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPositionContext>
  )
}

ToastViewport.displayName = 'Toast.Viewport'
