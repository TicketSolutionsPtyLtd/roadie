'use client'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { ToastTimeoutContext } from './ToastContext'
import type { ToastManager } from './createToastManager'

export type ToastProviderProps = Omit<
  ToastPrimitive.Provider.Props,
  'toastManager'
> & {
  /** A manager from `createToastManager`, to add toasts from outside React. */
  toastManager?: ToastManager
}

/** Holds the app's toasts. Mount once at the root. */
export function ToastProvider({
  timeout = 5000,
  ...props
}: ToastProviderProps) {
  return (
    <ToastTimeoutContext value={timeout}>
      <ToastPrimitive.Provider timeout={timeout} {...props} />
    </ToastTimeoutContext>
  )
}

ToastProvider.displayName = 'Toast.Provider'
