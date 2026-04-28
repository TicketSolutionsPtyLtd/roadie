'use client'

import { type RefAttributes, use } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@oztix/roadie-core/utils'

import { TabsContext } from './TabsContext'
import { tabsTabVariants } from './variants'

export type TabsTabProps = TabsPrimitive.Tab.Props &
  RefAttributes<HTMLButtonElement>

export function TabsTab({ className, ...props }: TabsTabProps) {
  const { emphasis, size } = use(TabsContext)
  return (
    <TabsPrimitive.Tab
      data-slot='tabs-tab'
      className={cn(tabsTabVariants({ emphasis, size }), className)}
      {...props}
    />
  )
}

TabsTab.displayName = 'Tabs.Tab'
