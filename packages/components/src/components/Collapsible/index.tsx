// No 'use client': dot access must work from server components.
import { CollapsiblePanel } from './CollapsiblePanel'
import { CollapsibleRoot } from './CollapsibleRoot'
import { CollapsibleTrigger } from './CollapsibleTrigger'

const Collapsible = CollapsibleRoot as typeof CollapsibleRoot & {
  Root: typeof CollapsibleRoot
  Trigger: typeof CollapsibleTrigger
  Panel: typeof CollapsiblePanel
}

Collapsible.Root = CollapsibleRoot
Collapsible.Trigger = CollapsibleTrigger
Collapsible.Panel = CollapsiblePanel

export { Collapsible }
export type { CollapsibleRootProps as CollapsibleProps } from './CollapsibleRoot'
export type { CollapsibleTriggerProps } from './CollapsibleTrigger'
export type { CollapsiblePanelProps } from './CollapsiblePanel'
