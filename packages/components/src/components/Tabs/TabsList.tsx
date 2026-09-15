'use client'

import { type RefAttributes, use, useCallback, useMemo } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { TabsContext } from './TabsContext'
import { tabsListVariants } from './variants'

export type TabsListProps = TabsPrimitive.List.Props &
  RefAttributes<HTMLDivElement>

/** Scrolls a list sideways just far enough to show its active tab. */
function revealActiveTab(list: HTMLElement) {
  const tab = list.querySelector<HTMLElement>('[role="tab"][data-active]')
  if (!tab) return
  const listRect = list.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()
  const beforeStart = tabRect.left - listRect.left
  const pastEnd = tabRect.right - listRect.right
  if (beforeStart < 0) list.scrollLeft += beforeStart
  else if (pastEnd > 0) list.scrollLeft += pastEnd
}

export function TabsList({ className, ref, ...props }: TabsListProps) {
  const { emphasis } = use(TabsContext)

  const keepActiveTabInView = useCallback((list: HTMLDivElement | null) => {
    if (!list) return
    revealActiveTab(list)
    const observer = new MutationObserver(() => revealActiveTab(list))
    observer.observe(list, {
      subtree: true,
      attributeFilter: ['data-active']
    })
    return () => observer.disconnect()
  }, [])
  const mergedRef = useMemo(
    () => mergeRefs(ref, keepActiveTabInView),
    [ref, keepActiveTabInView]
  )

  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      ref={mergedRef}
      className={cn(tabsListVariants({ emphasis }), className)}
      {...props}
    />
  )
}

TabsList.displayName = 'Tabs.List'
