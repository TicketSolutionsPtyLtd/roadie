'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

export type AutocompleteCollectionProps = AutocompletePrimitive.Collection.Props

export function AutocompleteCollection(props: AutocompleteCollectionProps) {
  return <AutocompletePrimitive.Collection {...props} />
}

AutocompleteCollection.displayName = 'Autocomplete.Collection'
