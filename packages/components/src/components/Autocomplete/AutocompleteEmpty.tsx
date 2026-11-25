'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import { listEmptyClass } from '../../variants'

export type AutocompleteEmptyProps = AutocompletePrimitive.Empty.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteEmpty({
  className,
  ...props
}: AutocompleteEmptyProps) {
  return (
    <AutocompletePrimitive.Empty
      data-slot='autocomplete-empty'
      className={cn(listEmptyClass, className)}
      {...props}
    />
  )
}

AutocompleteEmpty.displayName = 'Autocomplete.Empty'
