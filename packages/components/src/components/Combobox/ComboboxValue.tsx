'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

export type ComboboxValueProps = ComboboxPrimitive.Value.Props

export function ComboboxValue(props: ComboboxValueProps) {
  return <ComboboxPrimitive.Value {...props} />
}

ComboboxValue.displayName = 'Combobox.Value'
