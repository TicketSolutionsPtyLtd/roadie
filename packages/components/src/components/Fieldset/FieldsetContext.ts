'use client'

import { createContext } from 'react'

export type FieldsetContextValue = {
  invalid?: boolean
}

export const FieldsetContext = createContext<FieldsetContextValue>({})
