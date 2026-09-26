'use client'

import { createContext } from 'react'

export type CheckboxEmphasis = 'subtler' | 'normal'
export type CheckboxGroupDirection = 'vertical' | 'horizontal'

export type CheckboxGroupContextValue = {
  emphasis: CheckboxEmphasis
  direction: CheckboxGroupDirection
  invalid?: boolean
  required?: boolean
  setLabelId?: (id: string | undefined) => void
}

// Checkbox owns this seam and CheckboxGroup fills it, so a lone Checkbox
// never imports the group.
export const CheckboxGroupContext =
  createContext<CheckboxGroupContextValue | null>(null)
