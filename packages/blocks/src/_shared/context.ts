'use client'

import { createContext, use } from 'react'

import type { BlocksProviderProps } from '../Provider'

type BlocksContextValue = Omit<BlocksProviderProps, 'children'>

export const BlocksContext = createContext<BlocksContextValue>({})

export function useBlocks(): BlocksContextValue {
  return use(BlocksContext)
}
