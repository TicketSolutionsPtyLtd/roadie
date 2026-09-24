'use client'

import { createContext, use } from 'react'

export type SliderContextValue = {
  invalid?: boolean
  describedBy?: string
  fieldId?: string
}

export const SliderContext = createContext<SliderContextValue>({})

export function useSliderContext() {
  return use(SliderContext)
}
