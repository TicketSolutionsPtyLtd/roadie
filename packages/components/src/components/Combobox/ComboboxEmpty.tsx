'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

import { listEmptyClass } from '../../variants'

export type ComboboxEmptyProps = ComboboxPrimitive.Empty.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxEmpty({ className, ...props }: ComboboxEmptyProps) {
  return (
    <ComboboxPrimitive.Empty
      data-slot='combobox-empty'
      className={cn(listEmptyClass, className)}
      {...props}
    />
  )
}

ComboboxEmpty.displayName = 'Combobox.Empty'
