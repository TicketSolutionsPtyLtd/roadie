'use client'

import { createContext } from 'react'

import type { NumberFieldEmphasis, NumberFieldSize } from './variants'

export type NumberFieldContextValue = {
  size?: NumberFieldSize
  emphasis?: NumberFieldEmphasis
  invalid?: boolean
}

export const NumberFieldContext = createContext<NumberFieldContextValue>({})
