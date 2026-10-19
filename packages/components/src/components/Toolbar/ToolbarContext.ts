'use client'

import { createContext } from 'react'

export type ToolbarSize = 'sm' | 'md' | 'lg'

export type ToolbarEmphasis =
  'normal' | 'subtle' | 'subtler' | 'raised' | 'floating'

export type ToolbarContextValue = {
  size: ToolbarSize
  orientation: 'horizontal' | 'vertical'
}

export const ToolbarContext = createContext<ToolbarContextValue>({
  size: 'md',
  orientation: 'horizontal'
})

export type ToolbarToggleGroupContextValue = {
  // Base UI natively disables a disabled ToggleGroup's toggles, dropping them from the arrow order.
  disabled: boolean
  // The group's indicator draws the pressed fill, so it can slide between toggles.
  sliding: boolean
}

export const ToolbarToggleGroupContext =
  createContext<ToolbarToggleGroupContextValue>({
    disabled: false,
    sliding: false
  })
