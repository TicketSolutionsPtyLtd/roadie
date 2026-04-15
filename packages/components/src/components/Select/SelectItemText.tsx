'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

export type SelectItemTextProps = SelectPrimitive.ItemText.Props &
  RefAttributes<HTMLSpanElement>

export function SelectItemText(props: SelectItemTextProps) {
  return <SelectPrimitive.ItemText data-slot='select-item-text' {...props} />
}

SelectItemText.displayName = 'Select.ItemText'
