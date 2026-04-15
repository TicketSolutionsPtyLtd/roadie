'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxEmptyProps = ComboboxPrimitive.Empty.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxEmpty({ className, ...props }: ComboboxEmptyProps) {
  return (
    <ComboboxPrimitive.Empty
      data-slot='combobox-empty'
      className={cn(
        'text-center text-sm text-subtle empty:hidden [&:not(:empty)]:px-3 [&:not(:empty)]:py-4',
        className
      )}
      {...props}
    />
  )
}

ComboboxEmpty.displayName = 'Combobox.Empty'
