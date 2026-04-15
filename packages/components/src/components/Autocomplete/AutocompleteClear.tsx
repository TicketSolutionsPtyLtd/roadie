'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import { XIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type AutocompleteClearProps = AutocompletePrimitive.Clear.Props &
  RefAttributes<HTMLButtonElement>

export function AutocompleteClear({
  className,
  children,
  ...props
}: AutocompleteClearProps) {
  return (
    <AutocompletePrimitive.Clear
      data-slot='autocomplete-clear'
      className={cn(
        'shrink-0 cursor-pointer text-subtle hover:text-normal',
        className
      )}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-4' />}
    </AutocompletePrimitive.Clear>
  )
}

AutocompleteClear.displayName = 'Autocomplete.Clear'
