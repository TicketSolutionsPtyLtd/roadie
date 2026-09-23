'use client'

import { createContext, use } from 'react'

import type { OverlayEmphasis } from '../../variants'
import type { DrawerSide, DrawerSize } from './variants'

export const DrawerSideContext = createContext<DrawerSide>('bottom')

export function useDrawerSide() {
  return use(DrawerSideContext)
}

export const DrawerEmphasisContext = createContext<OverlayEmphasis | undefined>(
  undefined
)

// The popup reports its size so the backdrop, its sibling, can pick a default from it.
export const DrawerSizeContext = createContext<{
  size: DrawerSize | undefined
  setSize: (size: DrawerSize) => void
}>({ size: undefined, setSize: () => {} })

/** The root's emphasis, else `subtle` for a small top or bottom sheet, which peeks over its page. */
export function useDrawerEmphasis(): OverlayEmphasis {
  const emphasis = use(DrawerEmphasisContext)
  const side = use(DrawerSideContext)
  const { size } = use(DrawerSizeContext)
  if (emphasis) return emphasis
  const edgeSheet = side === 'bottom' || side === 'top'
  return edgeSheet && size === 'sm' ? 'subtle' : 'normal'
}
