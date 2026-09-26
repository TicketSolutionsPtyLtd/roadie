'use client'

import { createContext } from 'react'

export const ProgressValueTextContext = createContext<string | undefined>(
  undefined
)

export const ProgressHasIntentContext = createContext(false)
