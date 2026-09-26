'use client'

import { createContext } from 'react'

import type { ToastObject } from '@base-ui/react/toast'

import type { ToastPosition } from './variants'

export const ToastObjectContext = createContext<
  ToastObject<object> | undefined
>(undefined)

export const ToastPositionContext = createContext<ToastPosition>('bottom-end')

// Base UI's default; `Toast.Provider` overrides it with its own `timeout`.
export const ToastTimeoutContext = createContext(5000)
