'use client'

import { Autocomplete, type AutocompleteGroupLabelProps } from '../Autocomplete'

export type CommandPaletteGroupLabelProps = AutocompleteGroupLabelProps

export function CommandPaletteGroupLabel(props: CommandPaletteGroupLabelProps) {
  return (
    <Autocomplete.GroupLabel
      data-slot='command-palette-group-label'
      {...props}
    />
  )
}

CommandPaletteGroupLabel.displayName = 'CommandPalette.GroupLabel'
