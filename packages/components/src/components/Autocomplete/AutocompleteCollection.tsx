'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { useCollectionChildren } from '../../utils/virtualList'

export type AutocompleteCollectionProps = AutocompletePrimitive.Collection.Props

export function AutocompleteCollection({
  children
}: AutocompleteCollectionProps) {
  return (
    <AutocompletePrimitive.Collection>
      {useCollectionChildren(children)}
    </AutocompletePrimitive.Collection>
  )
}

AutocompleteCollection.displayName = 'Autocomplete.Collection'
