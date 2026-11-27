'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { mergeClassName } from '../../utils/mergeClassName'

export type AutocompleteStatusProps = AutocompletePrimitive.Status.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteStatus({
  className,
  ...props
}: AutocompleteStatusProps) {
  return (
    <AutocompletePrimitive.Status
      data-slot='autocomplete-status'
      className={mergeClassName('sr-only', className)}
      {...props}
    />
  )
}

AutocompleteStatus.displayName = 'Autocomplete.Status'
