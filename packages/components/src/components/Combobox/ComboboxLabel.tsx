'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { mergeClassName } from '../../utils/mergeClassName'

export type ComboboxLabelProps = ComboboxPrimitive.Label.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxLabel({ className, ...props }: ComboboxLabelProps) {
  return (
    <ComboboxPrimitive.Label
      data-slot='combobox-label'
      className={mergeClassName('text-sm font-medium text-normal', className)}
      {...props}
    />
  )
}

ComboboxLabel.displayName = 'Combobox.Label'
