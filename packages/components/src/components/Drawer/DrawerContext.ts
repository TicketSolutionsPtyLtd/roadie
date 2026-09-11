'use client'

import { createContext, use } from 'react'

import type { DrawerSide } from './variants'

export const DrawerSideContext = createContext<DrawerSide>('bottom')

export function useDrawerSide() {
  return use(DrawerSideContext)
}
