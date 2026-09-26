'use client'

import { type RefAttributes, use } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import {
  PointerHighlightContext,
  optionHighlightClass
} from '../../utils/optionHighlight'

export type AutocompleteItemProps = AutocompletePrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteItem({
  className,
  ...props
}: AutocompleteItemProps) {
  const byPointer = use(PointerHighlightContext)
  return (
    <AutocompletePrimitive.Item
      data-slot='autocomplete-item'
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        optionHighlightClass(byPointer),
        className
      )}
      {...props}
    />
  )
}

AutocompleteItem.displayName = 'Autocomplete.Item'
