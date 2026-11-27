'use client'

import { Autocomplete, type AutocompleteCollectionProps } from '../Autocomplete'

export type CommandPaletteCollectionProps = AutocompleteCollectionProps

export function CommandPaletteCollection(props: CommandPaletteCollectionProps) {
  return <Autocomplete.Collection {...props} />
}

CommandPaletteCollection.displayName = 'CommandPalette.Collection'
