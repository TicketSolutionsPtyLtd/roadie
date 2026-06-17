'use client'

import { createContext, use } from 'react'

import type { EmptyStateSize } from './variants'

/** Size flows from EmptyStateRoot to every sub-component via this context. */
export const EmptyStateContext = createContext<EmptyStateSize>('md')

export function useEmptyStateSize(): EmptyStateSize {
  return use(EmptyStateContext)
}
