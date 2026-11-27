'use client'

import type { RefAttributes } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { mergeClassName } from '../../utils/mergeClassName'

export type TabsPanelProps = TabsPrimitive.Panel.Props &
  RefAttributes<HTMLDivElement>

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  return (
    <TabsPrimitive.Panel
      data-slot='tabs-panel'
      className={mergeClassName('is-focusable', className)}
      {...props}
    />
  )
}

TabsPanel.displayName = 'Tabs.Panel'
