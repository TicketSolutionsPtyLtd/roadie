'use client'

import { useState } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { touchOnOption } from '../../utils/keepTouchTap'
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
  const { typed, handleQueryChange, resetTyped } = useTypedQuery(props.open)
  const [textState, setTextState] = useState(String(props.defaultValue ?? ''))
  const text = props.value === undefined ? textState : String(props.value ?? '')
  const fillsInput = mode === 'both' || mode === 'inline'
  const filters = mode === undefined || mode === 'list' || mode === 'both'
  const rankedItems = useRankedItems(items, {
    enabled:
      filters &&
      props.filter === undefined &&
      props.filteredItems === undefined,
    query: text,
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
        items={rankedItems}
        autoHighlight={highlightsFirst ? 'always' : false}
        onValueChange={(next, details) => {
          onValueChange?.(next, details)
          setTextState(next)
          if (details.reason === 'input-change')
            handleQueryChange(next, details)
          else resetTyped(details)
        }}
        onOpenChange={(open, details) => {
          // A finger down on an option holds the list until it lifts, as
          // the keyboard going can blur the input or move the page first.
          if (!open && touchOnOption()) {
            details.cancel()
            return
          }
          onOpenChange?.(open, details)
          if (!open) resetTyped(details)
        }}
        {...props}
      />
    </PointerHighlightContext>
  )
}

AutocompleteRoot.displayName = 'Autocomplete.Root'
