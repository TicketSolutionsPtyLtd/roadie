'use client'

import { type CSSProperties, type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { ToastObjectContext, ToastTimeoutContext } from './ToastContext'
import { timerRun } from './manager'

export type ToastProgressProps = ComponentProps<'div'>

/**
 * A thin bar along the bottom of a timed toast that empties as its time runs
 * out. It pauses whenever the toast's timer does: while the toasts are
 * hovered or focused, or the window is in the background. Renders nothing for
 * a toast that won't close on its own.
 */
export function ToastProgress({
  className,
  style,
  ...props
}: ToastProgressProps) {
  const toast = use(ToastObjectContext)
  const providerTimeout = use(ToastTimeoutContext)
  const timeout = toast?.timeout ?? providerTimeout
  if (!toast || toast.type === 'loading' || !(timeout > 0)) return null
  return (
    <div
      key={`${String(timerRun(toast))}-${timeout}`}
      data-slot='toast-progress'
      aria-hidden='true'
      style={{ '--toast-timeout': `${timeout}ms`, ...style } as CSSProperties}
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-(--intent-border-normal) ltr:origin-left rtl:origin-right',
        className
      )}
      {...props}
    />
  )
}

ToastProgress.displayName = 'Toast.Progress'
