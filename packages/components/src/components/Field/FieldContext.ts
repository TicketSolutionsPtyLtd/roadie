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

/** What a control says for itself, which wins over or joins its Field's. */
export type FieldControlOwnProps = {
  id?: string
  invalid?: boolean
  required?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

/**
 * A control's id and ARIA props from its Field. Helper text, then error
 * text while invalid, then the control's own `aria-describedby` describe it.
 * `labelled` adds `aria-labelledby` for a control a `<label>` can't name.
 */
export function useFieldControlProps(
  own: FieldControlOwnProps = {},
  { labelled = false } = {}
) {
  const field = use(FieldContext)
  const invalid = own.invalid ?? field.invalid
  const required = own.required ?? field.required
  const describedBy = [
    field.helperTextId,
    invalid && field.errorTextId,
    own['aria-describedby']
  ]
    .filter(Boolean)
    .join(' ')
  return {
    id: own.id ?? (field.fieldId || undefined),
    'aria-invalid': invalid || undefined,
    'aria-required': required || undefined,
    'aria-describedby': describedBy || undefined,
    ...(labelled && {
      'aria-labelledby':
        own['aria-labelledby'] ??
        (own['aria-label'] ? undefined : field.labelId || undefined)
    })
  }
}

export function useFieldInputProps() {
  const { disabled } = use(FieldContext)
  return { ...useFieldControlProps(), disabled: disabled || undefined }
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
