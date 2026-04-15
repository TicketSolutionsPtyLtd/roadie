'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxLabelProps = ComboboxPrimitive.Label.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxLabel({ className, ...props }: ComboboxLabelProps) {
  return (
    <ComboboxPrimitive.Label
      data-slot='combobox-label'
      className={cn('text-sm font-medium text-normal', className)}
      {...props}
    />
  )
}

ComboboxLabel.displayName = 'Combobox.Label'
