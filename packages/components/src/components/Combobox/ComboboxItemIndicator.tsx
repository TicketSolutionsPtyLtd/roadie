'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { CheckIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxItemIndicatorProps = ComboboxPrimitive.ItemIndicator.Props &
  RefAttributes<HTMLSpanElement>

export function ComboboxItemIndicator({
  className,
  children,
  ...props
}: ComboboxItemIndicatorProps) {
  return (
    <ComboboxPrimitive.ItemIndicator
      data-slot='combobox-item-indicator'
      className={cn('shrink-0 text-subtle', className)}
      {...props}
    >
      {children ?? <CheckIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.ItemIndicator>
  )
}

ComboboxItemIndicator.displayName = 'Combobox.ItemIndicator'
