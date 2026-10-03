'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import {
  PointerHighlightContext,
  usePointerHighlight
} from '../../utils/optionHighlight'

export type ComboboxRootProps<
  Value = unknown,
  Multiple extends boolean | undefined = false,
  Item = Value
> = Omit<
  ComboboxPrimitive.Root.Props<Value, Multiple, Item>,
  'autoHighlight'
> & {
  /**
   * Whether the first match is highlighted once the user types, so Enter
   * picks it. Opening the list without typing highlights nothing new.
   * @default true
   */
  autoHighlight?: boolean
}

export function ComboboxRoot<
  Value,
  Multiple extends boolean | undefined = false,
  Item = Value
>({
  onItemHighlighted,
  autoHighlight = true,
  ...props
}: ComboboxRootProps<Value, Multiple, Item>) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  return (
    <PointerHighlightContext value={byPointer}>
      <ComboboxPrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        autoHighlight={autoHighlight}
        {...props}
      />
    </PointerHighlightContext>
  )
}

ComboboxRoot.displayName = 'Combobox.Root'
