// Subpath entry for `@oztix/roadie-components/tabs`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md and
// docs/solutions/rsc-patterns/compound-export-namespace.md.
import { TabsIndicator } from './TabsIndicator'
import { TabsList } from './TabsList'
import { TabsPanel } from './TabsPanel'
import { TabsRoot } from './TabsRoot'
import { TabsTab } from './TabsTab'

const Tabs = TabsRoot as typeof TabsRoot & {
  Root: typeof TabsRoot
  List: typeof TabsList
  Tab: typeof TabsTab
  Indicator: typeof TabsIndicator
  Panel: typeof TabsPanel
}

Tabs.Root = TabsRoot
Tabs.List = TabsList
Tabs.Tab = TabsTab
Tabs.Indicator = TabsIndicator
Tabs.Panel = TabsPanel

export { Tabs }
export type { TabsRootProps as TabsProps } from './TabsRoot'
export type { TabsListProps } from './TabsList'
export type { TabsTabProps } from './TabsTab'
export type { TabsIndicatorProps } from './TabsIndicator'
export type { TabsPanelProps } from './TabsPanel'
export type {
  TabsRootDirection,
  TabsRootEmphasis,
  TabsRootIntent,
  TabsRootSize
} from './variants'
export {
  tabsListVariants,
  tabsTabVariants,
  tabsIndicatorVariants
} from './variants'
