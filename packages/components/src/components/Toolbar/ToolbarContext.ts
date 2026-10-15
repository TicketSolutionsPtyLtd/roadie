'use client'

import { createContext } from 'react'

export type ToolbarSize = 'sm' | 'md' | 'lg'

export type ToolbarContextValue = {
  size: ToolbarSize
}

export const ToolbarContext = createContext<ToolbarContextValue>({
  size: 'md'
})
