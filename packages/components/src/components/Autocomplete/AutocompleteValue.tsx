'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

export type AutocompleteValueProps = AutocompletePrimitive.Value.Props

export function AutocompleteValue(props: AutocompleteValueProps) {
  return (
    <AutocompletePrimitive.Value data-slot='autocomplete-value' {...props} />
  )
}

AutocompleteValue.displayName = 'Autocomplete.Value'
