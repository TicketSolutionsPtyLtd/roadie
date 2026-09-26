// No 'use client': dot access must work from server components.
import { CollapsiblePanel } from './CollapsiblePanel'
import { CollapsibleRoot } from './CollapsibleRoot'
import { CollapsibleText } from './CollapsibleText'
import { CollapsibleTrigger } from './CollapsibleTrigger'

const Collapsible = CollapsibleRoot as typeof CollapsibleRoot & {
  Root: typeof CollapsibleRoot
  Trigger: typeof CollapsibleTrigger
  Panel: typeof CollapsiblePanel
  Text: typeof CollapsibleText
}

Collapsible.Root = CollapsibleRoot
Collapsible.Trigger = CollapsibleTrigger
Collapsible.Panel = CollapsiblePanel
Collapsible.Text = CollapsibleText

export { Collapsible }
export type { CollapsibleRootProps as CollapsibleProps } from './CollapsibleRoot'
export type { CollapsibleTriggerProps } from './CollapsibleTrigger'
export type { CollapsiblePanelProps } from './CollapsiblePanel'
export type { CollapsibleTextProps } from './CollapsibleText'
