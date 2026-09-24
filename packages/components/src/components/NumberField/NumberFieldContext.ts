'use client'

import { createContext } from 'react'

import type { NumberFieldEmphasis, NumberFieldSize } from './variants'

export type NumberFieldContextValue = {
  size?: NumberFieldSize
  emphasis?: NumberFieldEmphasis
  invalid?: boolean
  value?: number | null
  min?: number
  max?: number
  step?: number
  removable?: boolean
  editable?: boolean
  stepCount?: number
  locale?: Intl.LocalesArgument
  format?: Intl.NumberFormatOptions
}

export const NumberFieldContext = createContext<NumberFieldContextValue>({})
