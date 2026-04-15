'use client'

import { Input, type InputProps } from '../Input'
import { useFieldInputProps } from './FieldContext'

export type FieldInputProps = InputProps

export function FieldInput(props: FieldInputProps) {
  const fieldProps = useFieldInputProps()
  return <Input data-slot='field-input' {...fieldProps} {...props} />
}

FieldInput.displayName = 'Field.Input'
