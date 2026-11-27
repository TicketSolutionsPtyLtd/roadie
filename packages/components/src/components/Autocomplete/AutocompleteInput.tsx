'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { useFieldControlProps } from '../Field/FieldContext'

export type AutocompleteInputProps = AutocompletePrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

export function AutocompleteInput({
  className,
  'aria-describedby': describedBy,
  ...props
}: AutocompleteInputProps) {
  const inField = !!useFieldContext().fieldId
  const fieldProps = useFieldControlProps(
    { 'aria-label': props['aria-label'], 'aria-describedby': describedBy },
    // Opening the list aria-hides Field.Label; aria-labelledby still reads it.
    { labelled: true }
  )

  return (
    <AutocompletePrimitive.Input
      data-slot='autocomplete-input'
      className={cn(
        'min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle',
        className
      )}
      {...(inField && fieldProps)}
      {...props}
      aria-describedby={fieldProps['aria-describedby']}
    />
  )
}

AutocompleteInput.displayName = 'Autocomplete.Input'
