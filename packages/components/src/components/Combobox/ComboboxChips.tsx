'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxChipsProps = ComboboxPrimitive.Chips.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxChips({ className, ...props }: ComboboxChipsProps) {
  return (
    <ComboboxPrimitive.Chips
      data-slot='combobox-chips'
      className={cn(
        'flex min-w-0 flex-1 flex-wrap items-center gap-1 py-(--combobox-chips-py) *:data-[slot=combobox-input]:min-w-16',
        className
      )}
      {...props}
    />
  )
}

ComboboxChips.displayName = 'Combobox.Chips'
