'use client'

import { createContext, use } from 'react'

export type SliderSize = 'sm' | 'md' | 'lg'

export type SliderContextValue = {
  size?: SliderSize
  invalid?: boolean
  describedBy?: string
  fieldId?: string
}

export const SliderContext = createContext<SliderContextValue>({})

export function useSliderContext() {
  return use(SliderContext)
}
