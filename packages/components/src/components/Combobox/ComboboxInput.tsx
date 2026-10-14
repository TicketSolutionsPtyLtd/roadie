'use client'

import type { KeyboardEvent, RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { useDirection } from '@base-ui/react/direction-provider'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'

export type ComboboxInputProps = ComboboxPrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

function lastChip(input: HTMLInputElement) {
  const chips = input
    .closest('[data-slot=combobox-chips]')
    ?.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]')
  return chips?.[chips.length - 1]
}

function isModified(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
}

export function ComboboxInput({
  className,
  onKeyDown,
  ...props
}: ComboboxInputProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId
  const previousChipKey = useDirection() === 'rtl' ? 'ArrowRight' : 'ArrowLeft'

  return (
    <ComboboxPrimitive.Input
      data-slot='combobox-input'
      className={cn(
        'min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle',
        className
      )}
      {...(inField && {
        id: fieldContext.fieldId,
        // Opening the list aria-hides Field.Label; aria-labelledby still reads it.
        'aria-labelledby': props['aria-label']
          ? undefined
          : fieldContext.labelId,
        'aria-invalid': fieldContext.invalid || undefined,
        'aria-required': fieldContext.required || undefined,
        'aria-describedby': fieldContext.invalid
          ? fieldContext.errorTextId || undefined
          : fieldContext.helperTextId || undefined
      })}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        const input = event.currentTarget
        if (event.baseUIHandlerPrevented || input.readOnly || isModified(event))
          return
        const selectsChip =
          (event.key === 'Backspace' && input.value === '') ||
          (event.key === previousChipKey && input.selectionStart === 0)
        const chip = selectsChip ? lastChip(input) : undefined
        if (!chip) return
        // Base UI's Backspace deletes the chip, and its arrow starts from the
        // chip it last moved to, though Escape on a chip has left it.
        event.preventBaseUIHandler()
        event.preventDefault()
        chip.focus()
      }}
      {...props}
    />
  )
}

ComboboxInput.displayName = 'Combobox.Input'
