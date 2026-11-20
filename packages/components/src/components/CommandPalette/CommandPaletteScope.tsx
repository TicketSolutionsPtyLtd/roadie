'use client'

import { ToggleGroup, type ToggleGroupItemProps } from '../ToggleGroup'

export type CommandPaletteScopeProps = ToggleGroupItemProps & {
  /** The type, matched against a command's or group's `scope`. */
  value: string
}

/** One type tab in `CommandPalette.Scopes`. */
export function CommandPaletteScope(props: CommandPaletteScopeProps) {
  return <ToggleGroup.Item data-slot='command-palette-scope' {...props} />
}

CommandPaletteScope.displayName = 'CommandPalette.Scope'
