// NO `'use client'`: server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { ToolbarButton } from './ToolbarButton'
import { ToolbarGroup } from './ToolbarGroup'
import { ToolbarRoot } from './ToolbarRoot'
import { ToolbarSeparator } from './ToolbarSeparator'
import { ToolbarToggle } from './ToolbarToggle'
import { ToolbarToggleGroup } from './ToolbarToggleGroup'

const Toolbar = ToolbarRoot as typeof ToolbarRoot & {
  Root: typeof ToolbarRoot
  Group: typeof ToolbarGroup
  Button: typeof ToolbarButton
  Separator: typeof ToolbarSeparator
  Toggle: typeof ToolbarToggle
  ToggleGroup: typeof ToolbarToggleGroup
}

Toolbar.Root = ToolbarRoot
Toolbar.Group = ToolbarGroup
Toolbar.Button = ToolbarButton
Toolbar.Separator = ToolbarSeparator
Toolbar.Toggle = ToolbarToggle
Toolbar.ToggleGroup = ToolbarToggleGroup

export { Toolbar }
export type { ToolbarRootProps as ToolbarProps } from './ToolbarRoot'
export type { ToolbarGroupProps } from './ToolbarGroup'
export type { ToolbarButtonProps } from './ToolbarButton'
export type { ToolbarSeparatorProps } from './ToolbarSeparator'
export type { ToolbarToggleProps } from './ToolbarToggle'
export type { ToolbarToggleGroupProps } from './ToolbarToggleGroup'
export type { ToolbarEmphasis, ToolbarSize } from './ToolbarContext'
