'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { useHeldOpen } from '../../utils/keepTouchTap'
import {
  PointerHighlightContext,
  usePointerHighlight,
  useTypedQuery
} from '../../utils/optionHighlight'
import { useHeldWhileClosed, useRankedItems } from '../../utils/rankMatches'
import { ComboboxReadOnlyContext } from './readOnly'

export type ComboboxRootProps<
  Value = unknown,
  Multiple extends boolean | undefined = false,
  Item = Value
> = Omit<
  ComboboxPrimitive.Root.Props<Value, Multiple, Item>,
  'autoHighlight'
> & {
  /**
   * Whether the first match is highlighted, so Enter picks it.
   * - `true`: once the user types, including matches that arrive later.
   *   Opening the list without typing highlights nothing.
   * - `'always'`: whenever the list shows an item, even with no text.
   * - `false`: only an item moved to with the arrows or the pointer.
   * @default true
   */
  autoHighlight?: boolean | 'always'
}

type AutoHighlightMode = ComboboxPrimitive.Root.Props<unknown>['autoHighlight']
type OpenChangeDetails = Parameters<
  NonNullable<ComboboxPrimitive.Root.Props<unknown>['onOpenChange']>
>[1]

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
  const [rankQuery, handleRankOpenChange] = useHeldWhileClosed(
    query,
    props.open,
    props.defaultOpen
  )
  const rankedItems = useRankedItems(items, {
    enabled: props.filter === undefined && props.filteredItems === undefined,
    query: rankQuery,
    label: props.itemToStringLabel,
    locale: props.locale
  })
  // Base UI types 'always' for Autocomplete only; its Combobox handles it.
  const mode = (
    autoHighlight === 'always' || (autoHighlight && typed) ? 'always' : false
  ) as AutoHighlightMode
  const [open, handleOpenChange] = useHeldOpen(
    props.open,
    props.defaultOpen,
    (open: boolean, details: OpenChangeDetails) => {
      onOpenChange?.(open, details)
      if (!open) resetTyped(details)
      handleRankOpenChange(open, details)
    }
  )
  return (
    <PointerHighlightContext value={byPointer}>
      <ComboboxReadOnlyContext value={!!props.readOnly}>
        <ComboboxPrimitive.Root
          onItemHighlighted={handleItemHighlighted}
          autoHighlight={mode}
          items={rankedItems}
          onInputValueChange={(next, details) => {
            onInputValueChange?.(next, details)
            handleQueryChange(next, details)
          }}
          onValueChange={(next, details) => {
            // Base UI's Escape in a closed list clears every chip, not just the
            // text. Kept, the Escape did nothing, so a dialog around can close.
            if (props.multiple && details.reason === 'escape-key') {
              details.cancel()
              details.allowPropagation()
              return
            }
            onValueChange?.(next, details)
            resetTyped(details)
          }}
          {...props}
          // After the rest, so an explicit open={undefined} can't undo it.
          open={open}
          onOpenChange={handleOpenChange}
        />
      </ComboboxReadOnlyContext>
    </PointerHighlightContext>
  )
}

ComboboxRoot.displayName = 'Combobox.Root'
