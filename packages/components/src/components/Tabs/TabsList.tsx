'use client'

import { type RefAttributes, use } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@oztix/roadie-core/utils'

import { TabsContext } from './TabsContext'
import { tabsListVariants } from './variants'

export type TabsListProps = TabsPrimitive.List.Props &
  RefAttributes<HTMLDivElement>

export function TabsList({ className, ...props }: TabsListProps) {
  const { emphasis } = use(TabsContext)
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn(tabsListVariants({ emphasis }), className)}
      {...props}
    />
  )
}

TabsList.displayName = 'Tabs.List'
