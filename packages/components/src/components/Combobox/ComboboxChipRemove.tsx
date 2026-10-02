'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { XIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxChipRemoveProps = Omit<
  ComboboxPrimitive.ChipRemove.Props,
  'aria-label'
> &
  RefAttributes<HTMLButtonElement> & {
    /** Names the value it removes, such as "Remove Rock". */
    'aria-label': string
  }

export function ComboboxChipRemove({
  className,
  children,
  ...props
}: ComboboxChipRemoveProps) {
  return (
    <ComboboxPrimitive.ChipRemove
      data-slot='combobox-chip-remove'
      className={cn(
        'is-interactive relative inline-grid size-5 shrink-0 place-items-center rounded-full emphasis-subtler after:absolute after:-inset-0.5 data-disabled:opacity-100 data-disabled:filter-none',
        className
      )}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-3' />}
    </ComboboxPrimitive.ChipRemove>
  )
}

ComboboxChipRemove.displayName = 'Combobox.ChipRemove'
