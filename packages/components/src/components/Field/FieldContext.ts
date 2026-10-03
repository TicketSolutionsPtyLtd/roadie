'use client'

import { createContext, use, useEffect, useId } from 'react'

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

/**
 * Why a control's own text is invalid, such as a date it can't read. Kept off
 * `FieldContext` so the public hooks stay as they are.
 */
export type FieldControlErrorValue = {
  controlError: string | null
  /** `undefined` removes the control, as it unmounts. */
  setControlError?: (
    control: string,
    message: string | null | undefined
  ) => void
}

export const FieldControlErrorContext = createContext<FieldControlErrorValue>({
  controlError: null
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

/** Shows a control's own error in `Field.ErrorText` while the control is mounted. */
export function useFieldControlError(message: string | null) {
  const control = useId()
  const { setControlError } = use(FieldControlErrorContext)
  useEffect(() => {
    setControlError?.(control, message)
  }, [setControlError, control, message])
  // Removed only on unmount, so the control keeps its place.
  useEffect(
    () => () => setControlError?.(control, undefined),
    [setControlError, control]
  )
}
