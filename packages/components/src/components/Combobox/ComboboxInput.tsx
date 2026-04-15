'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'

export type ComboboxInputProps = ComboboxPrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

export function ComboboxInput({ className, ...props }: ComboboxInputProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <ComboboxPrimitive.Input
      data-slot='combobox-input'
      className={cn(
        'min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle',
        className
      )}
      {...(inField && {
        id: fieldContext.fieldId,
        'aria-invalid': fieldContext.invalid || undefined,
        'aria-required': fieldContext.required || undefined,
        'aria-describedby': fieldContext.invalid
          ? fieldContext.errorTextId || undefined
          : fieldContext.helperTextId || undefined
      })}
      {...props}
    />
  )
}

ComboboxInput.displayName = 'Combobox.Input'
