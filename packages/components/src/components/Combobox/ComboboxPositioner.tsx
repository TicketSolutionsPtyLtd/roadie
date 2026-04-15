'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxPositionerProps = ComboboxPrimitive.Positioner.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxPositioner({
  className,
  ...props
}: ComboboxPositionerProps) {
  return (
    <ComboboxPrimitive.Positioner
      data-slot='combobox-positioner'
      className={cn('z-50', className)}
      sideOffset={4}
      {...props}
    />
  )
}

ComboboxPositioner.displayName = 'Combobox.Positioner'
