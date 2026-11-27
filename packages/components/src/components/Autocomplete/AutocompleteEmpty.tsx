'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { mergeClassName } from '../../utils/mergeClassName'
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
      className={mergeClassName(listEmptyClass, className)}
      {...props}
    />
  )
}

AutocompleteEmpty.displayName = 'Autocomplete.Empty'
