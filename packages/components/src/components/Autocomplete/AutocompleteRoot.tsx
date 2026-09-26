'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import {
  PointerHighlightContext,
  usePointerHighlight
} from '../../utils/optionHighlight'

export type AutocompleteRootProps = AutocompletePrimitive.Root.Props<unknown>

export function AutocompleteRoot({
  onItemHighlighted,
  ...props
}: AutocompleteRootProps) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  return (
    <PointerHighlightContext value={byPointer}>
      <AutocompletePrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        {...props}
      />
    </PointerHighlightContext>
  )
}

AutocompleteRoot.displayName = 'Autocomplete.Root'
