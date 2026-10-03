'use client'

import { useState } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import {
  PointerHighlightContext,
  usePointerHighlight
} from '../../utils/optionHighlight'

export type AutocompleteRootProps = Omit<
  AutocompletePrimitive.Root.Props<unknown>,
  'autoHighlight'
> & {
  /**
   * Whether the first suggestion is highlighted, so Enter takes it.
   * - `'always'`: whenever suggestions show, even with no text.
   * - `true`: once the user types.
   * - `false`: only an item moved to with the arrows.
   *
   * By default, the first suggestion is highlighted while the input has
   * text, including suggestions that arrive later. With no text, Enter
   * submits the form. In `both` and `inline` mode nothing is highlighted,
   * since a highlight there fills the input.
   */
  autoHighlight?: boolean | 'always'
}

export function AutocompleteRoot({
  onItemHighlighted,
  mode,
  value,
  defaultValue,
  onValueChange,
  autoHighlight,
  ...props
}: AutocompleteRootProps) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  const [uncontrolledText, setUncontrolledText] = useState(defaultValue ?? '')
  const text = String(value ?? uncontrolledText)
  const fillsInput = mode === 'both' || mode === 'inline'
  return (
    <PointerHighlightContext value={byPointer}>
      <AutocompletePrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        mode={mode}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next, details) => {
          setUncontrolledText(next)
          onValueChange?.(next, details)
        }}
        autoHighlight={
          autoHighlight ??
          (!fillsInput && text.trim() !== '' ? 'always' : false)
        }
        {...props}
      />
    </PointerHighlightContext>
  )
}

AutocompleteRoot.displayName = 'Autocomplete.Root'
