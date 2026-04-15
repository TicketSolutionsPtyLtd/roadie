'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

export type ComboboxCollectionProps = ComboboxPrimitive.Collection.Props

export function ComboboxCollection(props: ComboboxCollectionProps) {
  return <ComboboxPrimitive.Collection {...props} />
}

ComboboxCollection.displayName = 'Combobox.Collection'
