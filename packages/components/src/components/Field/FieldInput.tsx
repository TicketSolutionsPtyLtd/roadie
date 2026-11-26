'use client'

import { Input, type InputProps } from '../Input'
import { useFieldContext, useFieldControlProps } from './FieldContext'

export type FieldInputProps = InputProps

export function FieldInput({
  'aria-describedby': describedBy,
  ...props
}: FieldInputProps) {
  const { disabled } = useFieldContext()
  const fieldProps = useFieldControlProps({ 'aria-describedby': describedBy })
  return (
    <Input
      data-slot='field-input'
      {...fieldProps}
      disabled={disabled || undefined}
      {...props}
    />
  )
}

FieldInput.displayName = 'Field.Input'
