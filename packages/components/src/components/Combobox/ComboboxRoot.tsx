'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import {
  PointerHighlightContext,
  usePointerHighlight,
  useTypedQuery
} from '../../utils/optionHighlight'
import { useRankedItems } from '../../utils/rankMatches'

export type ComboboxRootProps<
  Value = unknown,
  Multiple extends boolean | undefined = false,
  Item = Value
> = Omit<
  ComboboxPrimitive.Root.Props<Value, Multiple, Item>,
  'autoHighlight'
> & {
  /**
   * Whether the first match is highlighted while the user types, so Enter
   * picks it. Matches that arrive later are highlighted too. Opening the
   * list without typing doesn't highlight the first match.
   * @default true
   */
  autoHighlight?: boolean
}

type AutoHighlightMode = ComboboxPrimitive.Root.Props<unknown>['autoHighlight']

export function ComboboxRoot<
  Value,
  Multiple extends boolean | undefined = false,
  Item = Value
>({
  onItemHighlighted,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  autoHighlight = true,
  items,
  ...props
}: ComboboxRootProps<Value, Multiple, Item>) {
  const [byPointer, handleItemHighlighted] =
    usePointerHighlight(onItemHighlighted)
  const { typed, query, handleQueryChange, resetTyped } = useTypedQuery(
    props.open
  )
  const ranked = useRankedItems(items, {
    enabled: props.filter === undefined && props.filteredItems === undefined,
    query,
    open: props.open,
    defaultOpen: props.defaultOpen,
    label: props.itemToStringLabel,
    locale: props.locale
  })
  // Base UI types 'always' for Autocomplete only; its Combobox handles it.
  const mode = (autoHighlight && typed ? 'always' : false) as AutoHighlightMode
  return (
    <PointerHighlightContext value={byPointer}>
      <ComboboxPrimitive.Root
        onItemHighlighted={handleItemHighlighted}
        autoHighlight={mode}
        items={ranked.items}
        onInputValueChange={(next, details) => {
          onInputValueChange?.(next, details)
          handleQueryChange(next, details)
        }}
        onOpenChange={(open, details) => {
          onOpenChange?.(open, details)
          if (!open) resetTyped(details)
          ranked.handleOpenChange(open, details)
        }}
        onValueChange={(next, details) => {
          onValueChange?.(next, details)
          resetTyped(details)
        }}
        {...props}
      />
    </PointerHighlightContext>
  )
}

ComboboxRoot.displayName = 'Combobox.Root'
