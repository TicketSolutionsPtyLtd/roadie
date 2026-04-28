'use client'

import { type RefAttributes, use } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@oztix/roadie-core/utils'

import { TabsContext } from './TabsContext'
import { tabsIndicatorVariants } from './variants'

export type TabsIndicatorProps = TabsPrimitive.Indicator.Props &
  RefAttributes<HTMLSpanElement>

// `renderBeforeHydration` defaults to true so the indicator picks up
// its initial position inline at SSR time and doesn't flash from
// (0,0) → active position on first hydration. Base UI's own default
// is false; Roadie chooses true because nearly every Tabs use we
// expect renders inside a server component or static page.
export function TabsIndicator({
  className,
  renderBeforeHydration = true,
  ...props
}: TabsIndicatorProps) {
  const { emphasis } = use(TabsContext)
  return (
    <TabsPrimitive.Indicator
      data-slot='tabs-indicator'
      renderBeforeHydration={renderBeforeHydration}
      className={cn(tabsIndicatorVariants({ emphasis }), className)}
      {...props}
    />
  )
}

TabsIndicator.displayName = 'Tabs.Indicator'
