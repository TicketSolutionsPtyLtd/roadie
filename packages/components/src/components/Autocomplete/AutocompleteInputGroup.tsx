'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { autocompleteInputGroupVariants } from './variants'

export type AutocompleteInputGroupProps =
  AutocompletePrimitive.InputGroup.Props &
    RefAttributes<HTMLDivElement> &
    VariantProps<typeof autocompleteInputGroupVariants>

export function AutocompleteInputGroup({
  className,
  intent,
  emphasis,
  size,
  ...props
}: AutocompleteInputGroupProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <AutocompletePrimitive.InputGroup
      data-slot='autocomplete-input-group'
      className={cn(
        autocompleteInputGroupVariants({ intent, emphasis, size, className })
      )}
      aria-invalid={(inField && fieldContext.invalid) || undefined}
      {...props}
    />
  )
}

AutocompleteInputGroup.displayName = 'Autocomplete.InputGroup'
