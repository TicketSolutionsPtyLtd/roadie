'use client'

import { createContext, use } from 'react'

import type { MarketingBlocksProviderProps } from '../Provider'

type MarketingBlocksContextValue = Omit<
  MarketingBlocksProviderProps,
  'children'
>

export const MarketingBlocksContext =
  createContext<MarketingBlocksContextValue>({})

export function useMarketingBlocks(): MarketingBlocksContextValue {
  return use(MarketingBlocksContext)
}
