'use client'

import { createContext } from 'react'

import type { ToastPosition } from './variants'

export const ToastTypeContext = createContext<string | undefined>(undefined)

export const ToastPositionContext = createContext<ToastPosition>('bottom-end')
