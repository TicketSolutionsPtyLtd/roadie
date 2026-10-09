'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type AutocompletePortalProps = AutocompletePrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function AutocompletePortal(props: AutocompletePortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <AutocompletePrimitive.Portal {...props} {...scope} />
}

AutocompletePortal.displayName = 'Autocomplete.Portal'
