'use client'

import type { KeyboardEvent, RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { useDirection } from '@base-ui/react/direction-provider'

import { mergeClassName } from '../../utils/mergeClassName'
import { useFieldContext } from '../Field'
import { useFieldControlProps } from '../Field/FieldContext'

export type ComboboxInputProps = ComboboxPrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

function lastChip(input: HTMLInputElement) {
  const chips = input
    .closest('[data-slot=combobox-chips]')
    ?.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]')
  return chips?.[chips.length - 1]
}

const CHIP_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'])

function isModified(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
}

export function ComboboxInput({
  className,
  onKeyDown,
  'aria-describedby': describedBy,
  ...props
}: ComboboxInputProps) {
  const inField = !!useFieldContext().fieldId
  const fieldProps = useFieldControlProps(
    { 'aria-label': props['aria-label'], 'aria-describedby': describedBy },
    // Opening the list aria-hides Field.Label; aria-labelledby still reads it.
    { labelled: true }
  )
  const previousChipKey = useDirection() === 'rtl' ? 'ArrowRight' : 'ArrowLeft'

  return (
    <ComboboxPrimitive.Input
      data-slot='combobox-input'
      className={mergeClassName(
        'min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle',
        className
      )}
      {...(inField && fieldProps)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        const input = event.currentTarget
        if (event.baseUIHandlerPrevented || input.readOnly || isModified(event))
          return
        const chip = CHIP_KEYS.has(event.key) ? lastChip(input) : undefined
        if (!chip) return
        // Base UI's Backspace deletes the last chip, and its chip keys act on
        // the chip it last moved to, though Escape on a chip has left it.
        event.preventBaseUIHandler()
        const selectsChip =
          (event.key === 'Backspace' && input.value === '') ||
          (event.key === previousChipKey && input.selectionEnd === 0)
        if (!selectsChip) return
        event.preventDefault()
        chip.focus()
      }}
      {...props}
      aria-describedby={fieldProps['aria-describedby']}
    />
  )
}

ComboboxInput.displayName = 'Combobox.Input'
