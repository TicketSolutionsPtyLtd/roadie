'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import {
  PointerHighlightContext,
  usePointerHighlight,
  useTypedQuery
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
   * By default, the first suggestion is highlighted once the user types,
   * including suggestions that arrive later. Opening the list without typing
   * highlights nothing, so Enter submits the form. In `both` and `inline`
   * mode nothing is highlighted, since a highlight there fills the input.
   */
  autoHighlight?: boolean | 'always'
}

export function AutocompleteRoot({
  onItemHighlighted,
  mode,
  onValueChange,
  onOpenChange,
  autoHighlight,
  ...props
}: AutocompleteRootProps) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  const { typed, handleQueryChange, resetTyped } = useTypedQuery(props.open)
  const fillsInput = mode === 'both' || mode === 'inline'
  return (
    <PointerHighlightContext value={byPointer}>
      <AutocompletePrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        mode={mode}
        autoHighlight={
          autoHighlight ?? (!fillsInput && typed ? 'always' : false)
        }
        onValueChange={(next, details) => {
          onValueChange?.(next, details)
          if (details.reason === 'input-change')
            handleQueryChange(next, details)
          else resetTyped(details)
        }}
        onOpenChange={(open, details) => {
          onOpenChange?.(open, details)
          if (!open) resetTyped(details)
        }}
        {...props}
      />
    </PointerHighlightContext>
  )
}

AutocompleteRoot.displayName = 'Autocomplete.Root'
