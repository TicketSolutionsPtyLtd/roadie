'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

export type ComboboxRootProps = ComboboxPrimitive.Root.Props<unknown>

export function ComboboxRoot(props: ComboboxRootProps) {
  return <ComboboxPrimitive.Root {...props} />
}

ComboboxRoot.displayName = 'Combobox.Root'
