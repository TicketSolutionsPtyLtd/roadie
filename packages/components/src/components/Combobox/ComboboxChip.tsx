'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxChipProps = ComboboxPrimitive.Chip.Props &
  RefAttributes<HTMLDivElement> & {
    /** Shows the chip selected while focus stays elsewhere, such as in the input while its values are edited. */
    selected?: boolean
  }

export function ComboboxChip({
  className,
  selected,
  onMouseDown,
  onKeyDown,
  ...props
}: ComboboxChipProps) {
  return (
    <ComboboxPrimitive.Chip
      data-slot='combobox-chip'
      data-selected={selected ? '' : undefined}
      className={cn(
        'is-interactive inline-flex h-6 max-w-full min-w-0 cursor-default items-center gap-0.5 overflow-hidden rounded-full emphasis-subtle ps-2.5 pe-2.5 text-sm font-medium whitespace-nowrap focus:emphasis-strong focus:intent-accent active:scale-100 has-[[data-slot=combobox-chip-remove]]:pe-0.5 data-disabled:opacity-100 data-disabled:filter-none data-selected:emphasis-strong data-selected:intent-accent forced-colors:focus:border-[Highlight] forced-colors:data-selected:border-[Highlight]',
        className
      )}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        // Base UI's Chips would send the press to the input instead.
        if (!event.currentTarget.hasAttribute('aria-disabled'))
          event.preventBaseUIHandler()
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.baseUIHandlerPrevented || event.key !== 'Escape') return
        // Base UI keeps focus on the chip.
        event.preventBaseUIHandler()
        event.preventDefault()
        event.currentTarget
          .closest('[data-slot=combobox-chips]')
          ?.querySelector<HTMLElement>('[data-slot=combobox-input]')
          ?.focus()
      }}
      {...props}
    />
  )
}

ComboboxChip.displayName = 'Combobox.Chip'
