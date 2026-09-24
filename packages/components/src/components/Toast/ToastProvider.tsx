'use client'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import type { ToastManager } from './createToastManager'

export type ToastProviderProps = Omit<
  ToastPrimitive.Provider.Props,
  'toastManager'
> & {
  /** A manager from `createToastManager`, to add toasts from outside React. */
  toastManager?: ToastManager
}

/** Holds the app's toasts. Mount once at the root. */
export function ToastProvider(props: ToastProviderProps) {
  return <ToastPrimitive.Provider {...props} />
}

ToastProvider.displayName = 'Toast.Provider'
