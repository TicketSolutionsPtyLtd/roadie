'use client'

import { createContext } from 'react'

export type RadioGroupEmphasis = 'subtler' | 'normal'
export type RadioGroupDirection = 'vertical' | 'horizontal'

export type RadioGroupContextValue = {
  emphasis: RadioGroupEmphasis
  direction: RadioGroupDirection
  invalid?: boolean
  required?: boolean
}

export const RadioGroupContext = createContext<RadioGroupContextValue>({
  emphasis: 'subtler',
  direction: 'vertical'
})
