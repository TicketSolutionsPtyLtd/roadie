'use client'

import { useMemo } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { withIntent } from './manager'

/** The toasts on screen, and `add`, `update`, `close` and `promise` to change them. Call inside `Toast.Provider`. */
export function useToastManager() {
  const manager = ToastPrimitive.useToastManager()
  return useMemo(() => withIntent(manager), [manager])
}

export type UseToastManagerReturnValue = ReturnType<typeof useToastManager>
