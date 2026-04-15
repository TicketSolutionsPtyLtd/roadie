'use client'

import { createContext } from 'react'

export type SelectContextValue = {
  invalid?: boolean
  required?: boolean
}

export const SelectContext = createContext<SelectContextValue>({})
