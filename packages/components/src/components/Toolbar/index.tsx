// NO `'use client'`: server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { ToolbarButton } from './ToolbarButton'
import { ToolbarGroup } from './ToolbarGroup'
import { ToolbarLink } from './ToolbarLink'
import { ToolbarRoot } from './ToolbarRoot'
import { ToolbarSeparator } from './ToolbarSeparator'

const Toolbar = ToolbarRoot as typeof ToolbarRoot & {
  Root: typeof ToolbarRoot
  Group: typeof ToolbarGroup
  Button: typeof ToolbarButton
  Link: typeof ToolbarLink
  Separator: typeof ToolbarSeparator
}

Toolbar.Root = ToolbarRoot
Toolbar.Group = ToolbarGroup
Toolbar.Button = ToolbarButton
Toolbar.Link = ToolbarLink
Toolbar.Separator = ToolbarSeparator

export { Toolbar }
export type { ToolbarRootProps as ToolbarProps } from './ToolbarRoot'
export type { ToolbarGroupProps } from './ToolbarGroup'
export type { ToolbarButtonProps } from './ToolbarButton'
export type { ToolbarLinkProps } from './ToolbarLink'
export type { ToolbarSeparatorProps } from './ToolbarSeparator'
export type { ToolbarSize } from './ToolbarContext'
