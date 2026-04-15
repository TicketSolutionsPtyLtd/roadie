'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

export type AutocompleteEmptyProps = AutocompletePrimitive.Empty.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteEmpty({
  className,
  ...props
}: AutocompleteEmptyProps) {
  return (
    <AutocompletePrimitive.Empty
      data-slot='autocomplete-empty'
      className={cn(
        'text-center text-sm text-subtle empty:hidden [&:not(:empty)]:px-3 [&:not(:empty)]:py-4',
        className
      )}
      {...props}
    />
  )
}

AutocompleteEmpty.displayName = 'Autocomplete.Empty'
