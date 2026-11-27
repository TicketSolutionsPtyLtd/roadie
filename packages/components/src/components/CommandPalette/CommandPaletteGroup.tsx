'use client'

import { Autocomplete, type AutocompleteGroupProps } from '../Autocomplete'

export type CommandPaletteGroupProps = AutocompleteGroupProps

export function CommandPaletteGroup(props: CommandPaletteGroupProps) {
  return <Autocomplete.Group data-slot='command-palette-group' {...props} />
}

CommandPaletteGroup.displayName = 'CommandPalette.Group'
