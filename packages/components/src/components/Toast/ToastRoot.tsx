'use client'

import { type RefAttributes, use } from 'react'

import { useDirection } from '@base-ui/react/direction-provider'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@oztix/roadie-core/utils'

import { ToastPositionContext, ToastTypeContext } from './ToastContext'
import {
  type ToastPosition,
  toastIntent,
  toastRootVariants,
  toastSide
} from './variants'

export type ToastRootProps = ToastPrimitive.Root.Props &
  RefAttributes<HTMLDivElement>

type SwipeDirection = 'up' | 'down' | 'left' | 'right'

function swipeDirectionsFor(
  position: ToastPosition,
  direction: 'ltr' | 'rtl'
): SwipeDirection[] {
  const edge = toastSide(position) === 'top' ? 'up' : 'down'
  if (position.endsWith('center')) return [edge, 'left', 'right']
  return [edge, direction === 'rtl' ? 'left' : 'right']
}

/**
 * One toast. Its intent comes from the toast's `intent`, set when it was added.
 * It swipes away towards the viewport's edge, and sideways towards the end.
 */
export function ToastRoot({
  className,
  toast,
  swipeDirection,
  ...props
}: ToastRootProps) {
  const position = use(ToastPositionContext)
  const direction = useDirection()
  const side = toastSide(position)
  return (
    <ToastTypeContext value={toast.type}>
      <ToastPrimitive.Root
        data-slot='toast'
        data-side={side}
        toast={toast}
        swipeDirection={
          swipeDirection ?? swipeDirectionsFor(position, direction)
        }
        className={cn(
          toastRootVariants({ side, intent: toastIntent(toast.type) }),
          className
        )}
        {...props}
      />
    </ToastTypeContext>
  )
}

ToastRoot.displayName = 'Toast.Root'
