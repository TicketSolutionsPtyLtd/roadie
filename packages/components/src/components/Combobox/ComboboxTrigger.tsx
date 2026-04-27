'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxTriggerProps = ComboboxPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxTriggerProps) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot='combobox-trigger'
      className={cn(
        'shrink-0 text-subtle transition-transform duration-moderate data-[popup-open]:rotate-180',
        className
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.Trigger>
  )
}

ComboboxTrigger.displayName = 'Combobox.Trigger'
