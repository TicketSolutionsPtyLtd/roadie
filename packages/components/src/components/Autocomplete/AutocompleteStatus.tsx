'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

export type AutocompleteStatusProps = AutocompletePrimitive.Status.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteStatus({
  className,
  ...props
}: AutocompleteStatusProps) {
  return (
    <AutocompletePrimitive.Status
      data-slot='autocomplete-status'
      className={cn('sr-only', className)}
      {...props}
    />
  )
}

AutocompleteStatus.displayName = 'Autocomplete.Status'
