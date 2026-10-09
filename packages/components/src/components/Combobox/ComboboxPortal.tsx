'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type ComboboxPortalProps = ComboboxPrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxPortal(props: ComboboxPortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <ComboboxPrimitive.Portal {...props} {...scope} />
}

ComboboxPortal.displayName = 'Combobox.Portal'
