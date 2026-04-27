'use client'

import { createContext } from 'react'

import type { TabsRootEmphasis, TabsRootSize } from './variants'

// Cascades emphasis + size from <Tabs.Root> down to <Tabs.List>,
// <Tabs.Tab>, and <Tabs.Indicator> so consumers configure the
// segmented look once instead of repeating the prop on every leaf.
// Intent does not need a context — it cascades via the
// `intent-*` class on Tabs.Root which sets CSS custom properties
// children read from the cascade directly.
export type TabsContextValue = {
  emphasis: TabsRootEmphasis
  size: TabsRootSize
}

export const TabsContext = createContext<TabsContextValue>({
  emphasis: 'normal',
  size: 'md'
})
