'use client'

import { createContext } from 'react'

import type { ToggleGroupSize } from './variants'

export type ToggleGroupContextValue = {
  size: ToggleGroupSize
  raisePressed: boolean
}

export const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  size: 'md',
  raisePressed: true
})
