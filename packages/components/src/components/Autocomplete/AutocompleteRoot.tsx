'use client'

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
   * - `'always'`: whenever suggestions show.
   * - `true`: once the user types.
   * - `false`: only an item moved to with the arrows.
   *
   * Defaults to `false` in `both` and `inline` mode, where a highlight
   * fills the input.
   * @default 'always'
   */
  autoHighlight?: boolean | 'always'
}

export function AutocompleteRoot({
  onItemHighlighted,
  mode,
  autoHighlight = mode === 'both' || mode === 'inline' ? false : 'always',
  ...props
}: AutocompleteRootProps) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  return (
    <PointerHighlightContext value={byPointer}>
      <AutocompletePrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        mode={mode}
        autoHighlight={autoHighlight}
        {...props}
      />
    </PointerHighlightContext>
  )
}

AutocompleteRoot.displayName = 'Autocomplete.Root'
