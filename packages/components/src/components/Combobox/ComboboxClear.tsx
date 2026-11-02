'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { XIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { FIRST_ROW } from './variants'

export type ComboboxClearProps = ComboboxPrimitive.Clear.Props &
  RefAttributes<HTMLButtonElement>

export function ComboboxClear({
  className,
  children,
  ...props
}: ComboboxClearProps) {
  return (
    <ComboboxPrimitive.Clear
      data-slot='combobox-clear'
      className={cn(
        'shrink-0 cursor-pointer text-subtle hover:text-normal',
        FIRST_ROW,
        className
      )}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.Clear>
  )
}

ComboboxClear.displayName = 'Combobox.Clear'
