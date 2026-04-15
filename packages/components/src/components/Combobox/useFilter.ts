'use client'

import {
  type ComboboxFilter,
  type ComboboxFilterOptions,
  Combobox as ComboboxPrimitive
} from '@base-ui/react/combobox'

export const useFilter = ComboboxPrimitive.useFilter
export type Filter = ComboboxFilter
export type FilterOptions = ComboboxFilterOptions
