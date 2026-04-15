'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

export type AutocompletePortalProps = AutocompletePrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function AutocompletePortal(props: AutocompletePortalProps) {
  return <AutocompletePrimitive.Portal {...props} />
}

AutocompletePortal.displayName = 'Autocomplete.Portal'
