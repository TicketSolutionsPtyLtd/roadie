'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

export type SelectPortalProps = SelectPrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function SelectPortal(props: SelectPortalProps) {
  return <SelectPrimitive.Portal {...props} />
}

SelectPortal.displayName = 'Select.Portal'
