'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

export type ComboboxPortalProps = ComboboxPrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxPortal(props: ComboboxPortalProps) {
  return <ComboboxPrimitive.Portal {...props} />
}

ComboboxPortal.displayName = 'Combobox.Portal'
