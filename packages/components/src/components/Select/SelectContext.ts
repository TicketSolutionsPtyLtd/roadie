'use client'

import { createContext } from 'react'

import type { ItemLabel } from './itemLabels'

export type SelectContextValue = {
  invalid?: boolean
  required?: boolean
  registerLabel?: (value: unknown, label: ItemLabel) => void
}

export const SelectContext = createContext<SelectContextValue>({})
