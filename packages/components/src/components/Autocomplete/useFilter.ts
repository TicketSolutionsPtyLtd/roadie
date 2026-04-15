'use client'

import {
  type AutocompleteFilter,
  type AutocompleteFilterOptions,
  Autocomplete as AutocompletePrimitive
} from '@base-ui/react/autocomplete'

export const useFilter = AutocompletePrimitive.useFilter
export const useFilteredItems = AutocompletePrimitive.useFilteredItems
export type Filter = AutocompleteFilter
export type FilterOptions = AutocompleteFilterOptions
