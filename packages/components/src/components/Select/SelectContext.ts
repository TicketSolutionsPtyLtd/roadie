'use client'

import { type ReactNode, createContext } from 'react'

import type { ItemLabel } from './itemLabels'

export type SelectContextValue = {
  invalid?: boolean
  required?: boolean
  registerLabel?: (value: unknown, label: ItemLabel) => void
  multiple?: boolean
  displayLabel?: (value: unknown) => ReactNode
}

export const SelectContext = createContext<SelectContextValue>({})
