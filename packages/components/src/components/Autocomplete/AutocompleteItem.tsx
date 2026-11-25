'use client'

import { type RefAttributes, use } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import { keepTouchTap } from '../../utils/keepTouchTap'
import {
  PointerHighlightContext,
  optionHighlightClass
} from '../../utils/optionHighlight'
import { useVirtualItem } from '../../utils/virtualList'
import { optionRowClass } from '../../variants'

export type AutocompleteItemProps = AutocompletePrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteItem({
  className,
  onPointerDownCapture,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onMouseUp,
  onClickCapture,
  ref,
  ...props
}: AutocompleteItemProps) {
  const byPointer = use(PointerHighlightContext)
  const virtualItem = useVirtualItem(ref, props.value)
  return (
    <AutocompletePrimitive.Item
      data-slot='autocomplete-item'
      className={cn(optionRowClass, optionHighlightClass(byPointer), className)}
      {...keepTouchTap({
        onPointerDownCapture,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onMouseUp,
        onClickCapture
      })}
      {...props}
      {...virtualItem}
    />
  )
}

AutocompleteItem.displayName = 'Autocomplete.Item'
