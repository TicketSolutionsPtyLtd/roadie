'use client'

import { createContext, use } from 'react'

export type FieldContextValue = {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
  fieldId: string
  labelId: string
  helperTextId: string
  errorTextId: string
}

export const FieldContext = createContext<FieldContextValue>({
  fieldId: '',
  labelId: '',
  helperTextId: '',
  errorTextId: ''
})

export function useFieldContext() {
  return use(FieldContext)
}

export function useFieldInputProps() {
  const { invalid, required, disabled, fieldId, helperTextId, errorTextId } =
    use(FieldContext)
  const describedBy = invalid ? errorTextId : helperTextId
  return {
    id: fieldId || undefined,
    disabled: disabled || undefined,
    'aria-invalid': invalid || undefined,
    'aria-required': required || undefined,
    'aria-describedby': describedBy || undefined
  }
}
