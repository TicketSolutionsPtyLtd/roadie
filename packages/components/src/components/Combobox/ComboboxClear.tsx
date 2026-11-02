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
        'inline-grid size-5 shrink-0 place-items-center rounded-full emphasis-subtler text-subtle is-interactive',
        FIRST_ROW,
        // A 20px circle, not FIRST_ROW's 16px icon, so it sits 2px higher.
        'in-data-[slot=combobox-input-group]:mt-[calc(var(--combobox-chips-py)+--spacing(0.5))]',
        className
      )}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.Clear>
  )
}

ComboboxClear.displayName = 'Combobox.Clear'
