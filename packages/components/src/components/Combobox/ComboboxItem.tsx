'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxItemProps = ComboboxPrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxItem({ className, ...props }: ComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item
      data-slot='combobox-item'
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        'data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    />
  )
}

ComboboxItem.displayName = 'Combobox.Item'
