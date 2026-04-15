'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

export type AutocompleteRootProps = AutocompletePrimitive.Root.Props<unknown>

export function AutocompleteRoot(props: AutocompleteRootProps) {
  return <AutocompletePrimitive.Root {...props} />
}

AutocompleteRoot.displayName = 'Autocomplete.Root'
