'use client'

import { type RefAttributes, useEffect, useState } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

import { ToastAction } from './ToastAction'
import { ToastClose } from './ToastClose'
import { ToastContent } from './ToastContent'
import { ToastPositionContext } from './ToastContext'
import { ToastDescription } from './ToastDescription'
import { ToastIcon } from './ToastIcon'
import { ToastProgress } from './ToastProgress'
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

// Base UI pauses toast timers while the window is in the background but
// doesn't expose that, so mirror its window blur and focus handling. Like
// Base UI, it only listens while there are toasts.
function useWindowBlurred(listening: boolean) {
  const [blurred, setBlurred] = useState(false)
  useEffect(() => {
    if (!listening) return undefined
    const track = (event: FocusEvent) => {
      if (event.target === event.currentTarget)
        setBlurred(event.type === 'blur')
    }
    window.addEventListener('blur', track, true)
    window.addEventListener('focus', track, true)
    return () => {
      window.removeEventListener('blur', track, true)
      window.removeEventListener('focus', track, true)
    }
  }, [listening])
  return blurred
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
        <ToastProgress />
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
  const hasToasts = ToastPrimitive.useToastManager().toasts.length > 0
  const windowBlurred = useWindowBlurred(hasToasts)
  return (
    <ToastPositionContext value={position}>
      <ToastPrimitive.Portal container={container}>
        <ToastPrimitive.Viewport
          data-slot='toast-viewport'
          data-position={position}
          data-window-blurred={windowBlurred ? '' : undefined}
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
