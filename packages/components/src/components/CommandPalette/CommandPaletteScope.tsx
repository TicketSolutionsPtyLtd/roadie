'use client'

import { ToggleGroup, type ToggleGroupItemProps } from '../ToggleGroup'

export type CommandPaletteScopeProps = ToggleGroupItemProps & {
  /** The type, matched against a command's or group's `scope`. */
  value: string
}

/** One type tab in `CommandPalette.Scopes`. */
export function CommandPaletteScope(props: CommandPaletteScopeProps) {
  // Keeps ToggleGroup's own data-slot, which finds the pressed item.
  return <ToggleGroup.Item {...props} />
}

CommandPaletteScope.displayName = 'CommandPalette.Scope'
