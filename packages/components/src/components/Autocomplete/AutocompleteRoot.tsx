'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import {
  PointerHighlightContext,
  usePointerHighlight,
  useTypedQuery
} from '../../utils/optionHighlight'
import { useRankedItems } from '../../utils/rankMatches'

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
  items,
  ...props
}: AutocompleteRootProps) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  const { typed, query, handleQueryChange, resetTyped } = useTypedQuery(
    props.open
  )
  const fillsInput = mode === 'both' || mode === 'inline'
  const filters = mode === undefined || mode === 'list' || mode === 'both'
  const ranked = useRankedItems(items, {
    enabled:
      filters &&
      props.filter === undefined &&
      props.filteredItems === undefined,
    query,
    open: props.open,
    defaultOpen: props.defaultOpen,
    label: props.itemToStringValue,
    locale: props.locale
  })
  const highlightsFirst =
    autoHighlight === 'always' || ((autoHighlight ?? !fillsInput) && typed)
  return (
    <PointerHighlightContext value={byPointer}>
      <AutocompletePrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        mode={mode}
        items={ranked.items}
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
          ranked.handleOpenChange(open, details)
        }}
        {...props}
      />
    </PointerHighlightContext>
  )
}

AutocompleteRoot.displayName = 'Autocomplete.Root'
