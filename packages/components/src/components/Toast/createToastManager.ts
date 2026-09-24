'use client'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { withIntent } from './manager'

/** A manager you can call outside React. Pass it to `Toast.Provider`'s `toastManager`. */
export function createToastManager() {
  return withIntent(ToastPrimitive.createToastManager())
}

export type ToastManager = ReturnType<typeof createToastManager>
