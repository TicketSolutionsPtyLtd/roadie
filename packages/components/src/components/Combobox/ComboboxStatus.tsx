'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { mergeClassName } from '../../utils/mergeClassName'

export type ComboboxStatusProps = ComboboxPrimitive.Status.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxStatus({ className, ...props }: ComboboxStatusProps) {
  return (
    <ComboboxPrimitive.Status
      data-slot='combobox-status'
      className={mergeClassName('sr-only', className)}
      {...props}
    />
  )
}

ComboboxStatus.displayName = 'Combobox.Status'
