'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

export type AutocompletePopupProps = AutocompletePrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function AutocompletePopup({
  className,
  ...props
}: AutocompletePopupProps) {
  return (
    <AutocompletePrimitive.Popup
      data-slot='autocomplete-popup'
      className={cn(
        'max-h-[var(--available-height)] max-w-[var(--available-width)] min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-[var(--intent-border-subtle)] bg-raised p-1 shadow-lg',
        'origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

AutocompletePopup.displayName = 'Autocomplete.Popup'
