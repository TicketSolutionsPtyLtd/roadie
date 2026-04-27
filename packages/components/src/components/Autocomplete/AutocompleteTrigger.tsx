'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type AutocompleteTriggerProps = AutocompletePrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function AutocompleteTrigger({
  className,
  children,
  ...props
}: AutocompleteTriggerProps) {
  return (
    <AutocompletePrimitive.Trigger
      data-slot='autocomplete-trigger'
      className={cn(
        'shrink-0 text-subtle transition-transform duration-moderate data-[popup-open]:rotate-180',
        className
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight='bold' className='size-4' />}
    </AutocompletePrimitive.Trigger>
  )
}

AutocompleteTrigger.displayName = 'Autocomplete.Trigger'
