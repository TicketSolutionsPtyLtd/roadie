'use client'

import { createContext } from 'react'

import type { RadioGroupSize } from './variants'

export type RadioGroupEmphasis = 'subtler' | 'normal'
export type RadioGroupDirection = 'vertical' | 'horizontal'

export type RadioGroupContextValue = {
  emphasis: RadioGroupEmphasis
  direction: RadioGroupDirection
  size: RadioGroupSize
  invalid?: boolean
  required?: boolean
  setLabelId?: (id: string | undefined) => void
}

export const RadioGroupContext = createContext<RadioGroupContextValue>({
  emphasis: 'subtler',
  direction: 'vertical',
  size: 'md'
})
