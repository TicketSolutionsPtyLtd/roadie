'use client'

import { createContext, use } from 'react'

import type { OverlayEmphasis } from '../../variants'
import type { DrawerSide } from './variants'

export const DrawerSideContext = createContext<DrawerSide>('bottom')

export function useDrawerSide() {
  return use(DrawerSideContext)
}

// Undefined until the root sets it, so Content can pick a default from its size.
export const DrawerEmphasisContext = createContext<OverlayEmphasis | undefined>(
  undefined
)

export function useDrawerEmphasis() {
  return use(DrawerEmphasisContext)
}
