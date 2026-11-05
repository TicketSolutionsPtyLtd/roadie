'use client'

import type { RefAttributes } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@oztix/roadie-core/utils'

export type TabsPanelProps = TabsPrimitive.Panel.Props &
  RefAttributes<HTMLDivElement>

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  return (
    <TabsPrimitive.Panel
      data-slot='tabs-panel'
      className={cn('is-focusable', className)}
      {...props}
    />
  )
}

TabsPanel.displayName = 'Tabs.Panel'
