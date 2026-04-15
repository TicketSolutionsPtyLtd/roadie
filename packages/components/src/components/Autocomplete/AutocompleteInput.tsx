'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'

export type AutocompleteInputProps = AutocompletePrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

export function AutocompleteInput({
  className,
  ...props
}: AutocompleteInputProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <AutocompletePrimitive.Input
      data-slot='autocomplete-input'
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

AutocompleteInput.displayName = 'Autocomplete.Input'
