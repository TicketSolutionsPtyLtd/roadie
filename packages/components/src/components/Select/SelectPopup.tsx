'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

export type SelectPopupProps = SelectPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function SelectPopup({ className, ...props }: SelectPopupProps) {
  return (
    <SelectPrimitive.Popup
      data-slot='select-popup'
      className={cn(
        'max-h-[var(--available-height)] max-w-[var(--available-width)] min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-[var(--intent-border-subtle)] bg-raised p-1 shadow-lg',
        'origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

SelectPopup.displayName = 'Select.Popup'
