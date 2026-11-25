'use client'

import { type CSSProperties, type ComponentProps, use, useState } from 'react'

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
  // Base UI reads the provider default only when a timer starts, so a later
  // change to it mustn't restart the bar either.
  const loading = toast?.type === 'loading'
  const run = `${String(toast && timerRun(toast))}-${toast?.timeout}-${loading}`
  const [started, setStarted] = useState({
    run,
    timeout: toast?.timeout ?? providerTimeout
  })
  if (started.run !== run) {
    setStarted({ run, timeout: toast?.timeout ?? providerTimeout })
  }
  const { timeout } = started
  if (!toast || loading || !(timeout > 0)) return null
  return (
    <div
      key={run}
      data-slot='toast-progress'
      aria-hidden='true'
      style={{ '--time-left': `${timeout}ms`, ...style } as CSSProperties}
      // Pauses with Base UI's timer: while the toasts expand or the window blurs.
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-(--intent-border-normal) animate-time-left motion-reduce:hidden ltr:origin-left rtl:origin-right',
        'in-data-window-blurred:[animation-play-state:paused] in-[[data-slot=toast][data-expanded]]:[animation-play-state:paused]',
        className
      )}
      {...props}
    />
  )
}

ToastProgress.displayName = 'Toast.Progress'
