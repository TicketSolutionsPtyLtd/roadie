'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxChipProps = ComboboxPrimitive.Chip.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxChip({ className, ...props }: ComboboxChipProps) {
  return (
    <ComboboxPrimitive.Chip
      data-slot='combobox-chip'
      className={cn(
        'is-interactive inline-flex h-6 max-w-full min-w-0 cursor-default items-center gap-0.5 overflow-hidden rounded-full emphasis-subtle ps-2.5 pe-0.5 text-sm font-medium whitespace-nowrap active:scale-100 data-disabled:opacity-100 data-disabled:filter-none',
        className
      )}
      {...props}
    />
  )
}

ComboboxChip.displayName = 'Combobox.Chip'
