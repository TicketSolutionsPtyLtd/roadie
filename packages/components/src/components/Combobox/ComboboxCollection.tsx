'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { useCollectionChildren } from '../../utils/virtualList'

export type ComboboxCollectionProps = ComboboxPrimitive.Collection.Props

export function ComboboxCollection({ children }: ComboboxCollectionProps) {
  return (
    <ComboboxPrimitive.Collection>
      {useCollectionChildren(children)}
    </ComboboxPrimitive.Collection>
  )
}

ComboboxCollection.displayName = 'Combobox.Collection'
