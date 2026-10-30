'use client'

import { type RefAttributes, use } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { XIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { ComboboxReadOnlyContext } from './readOnly'

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
  // A read-only combobox can't remove a chip, so it shows no ✕ that looks like it could.
  if (use(ComboboxReadOnlyContext)) return null
  return (
    <ComboboxPrimitive.ChipRemove
      data-slot='combobox-chip-remove'
      className={cn(
        'is-interactive relative inline-grid size-5 shrink-0 place-items-center rounded-full emphasis-subtler after:absolute after:-inset-0.5 data-disabled:opacity-100 data-disabled:filter-none',
        // A selected chip is strong, where the intent's own tints vanish, so
        // the ✕ reads and tints in the on-strong colour, like a strong Button's icon.
        'in-[[data-slot=combobox-chip]:focus]:text-on-strong in-[[data-slot=combobox-chip]:focus]:[--intent-3a:color-mix(in_oklch,var(--intent-text-on-strong)_20%,transparent)] in-[[data-slot=combobox-chip]:focus]:[--intent-4a:color-mix(in_oklch,var(--intent-text-on-strong)_30%,transparent)]',
        'in-[[data-slot=combobox-chip][data-selected]]:text-on-strong in-[[data-slot=combobox-chip][data-selected]]:[--intent-3a:color-mix(in_oklch,var(--intent-text-on-strong)_20%,transparent)] in-[[data-slot=combobox-chip][data-selected]]:[--intent-4a:color-mix(in_oklch,var(--intent-text-on-strong)_30%,transparent)]',
        className
      )}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-3' />}
    </ComboboxPrimitive.ChipRemove>
  )
}

ComboboxChipRemove.displayName = 'Combobox.ChipRemove'
