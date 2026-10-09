'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type SelectPortalProps = SelectPrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function SelectPortal(props: SelectPortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <SelectPrimitive.Portal {...props} {...scope} />
}

SelectPortal.displayName = 'Select.Portal'
