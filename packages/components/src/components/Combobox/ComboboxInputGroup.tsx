'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { comboboxInputGroupVariants } from './variants'

export type ComboboxInputGroupProps = ComboboxPrimitive.InputGroup.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof comboboxInputGroupVariants>

export function ComboboxInputGroup({
  className,
  intent,
  emphasis,
  size,
  ...props
}: ComboboxInputGroupProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <ComboboxPrimitive.InputGroup
      data-slot='combobox-input-group'
      className={cn(
        comboboxInputGroupVariants({ intent, emphasis, size, className })
      )}
      aria-invalid={(inField && fieldContext.invalid) || undefined}
      {...props}
    />
  )
}

ComboboxInputGroup.displayName = 'Combobox.InputGroup'
