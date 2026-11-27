'use client'

import { createContext } from 'react'

import type { OTPFieldEmphasis, OTPFieldSize } from './variants'

export type OTPFieldContextValue = {
  size?: OTPFieldSize
  emphasis?: OTPFieldEmphasis
  invalid?: boolean
  label?: string
  autoFocus?: boolean
}

export const OTPFieldContext = createContext<OTPFieldContextValue>({})
