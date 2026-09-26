'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import {
  PointerHighlightContext,
  usePointerHighlight
} from '../../utils/optionHighlight'

export type ComboboxRootProps = ComboboxPrimitive.Root.Props<unknown>

export function ComboboxRoot({
  onItemHighlighted,
  ...props
}: ComboboxRootProps) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  return (
    <PointerHighlightContext value={byPointer}>
      <ComboboxPrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        {...props}
      />
    </PointerHighlightContext>
  )
}

ComboboxRoot.displayName = 'Combobox.Root'
