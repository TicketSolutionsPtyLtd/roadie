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
   * - `true`: once the user types, including suggestions that arrive later.
   *   Opening the list without typing highlights nothing, so Enter submits.
   * - `'always'`: whenever suggestions show, even with no text.
   * - `false`: only an item moved to with the arrows.
   *
   * Defaults to `true`, or `false` in `both` and `inline` mode, where a
   * highlight fills the input.
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
  const highlightsFirst =
    autoHighlight === 'always' || ((autoHighlight ?? !fillsInput) && typed)
  return (
    <PointerHighlightContext value={byPointer}>
      <AutocompletePrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        mode={mode}
        autoHighlight={highlightsFirst ? 'always' : false}
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
