'use client'

import { createContext } from 'react'

import type { ToggleGroupEmphasis, ToggleGroupSize } from './variants'

export type ToggleGroupContextValue = {
  size: ToggleGroupSize
  emphasis: ToggleGroupEmphasis
  raisePressed: boolean
}

export const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  size: 'md',
  emphasis: 'normal',
  raisePressed: true
})
