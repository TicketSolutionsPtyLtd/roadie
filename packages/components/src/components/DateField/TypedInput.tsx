'use client'

import type { ComponentProps } from 'react'

import { useFieldContext } from '../Field'
import type { useTypedValue } from './useTypedValue'

export type TypedInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'disabled' | 'type'
> & {
  typed: ReturnType<typeof useTypedValue>
  disabled?: boolean
  invalid?: boolean
  /** Takes the id `Field.Label` points at. Only one input in a field can. */
  labelledByField?: boolean
}

/** A text input wired to a typed value and the surrounding `Field`. */
export function TypedInput({
  typed,
  disabled,
  invalid,
  labelledByField = true,
  name,
  id,
  required,
  onBlur,
  onKeyDown,
  ...props
}: TypedInputProps) {
  const field = useFieldContext()
  const isInvalid = !!typed.error || (invalid ?? field.invalid)
  const describedBy = isInvalid ? field.errorTextId : field.helperTextId
  const isRequired = required ?? field.required

  return (
    <>
      <input
        type='text'
        autoComplete='off'
        spellCheck={false}
        id={id ?? ((labelledByField && field.fieldId) || undefined)}
        disabled={disabled || field.disabled || undefined}
        required={isRequired}
        aria-required={isRequired || undefined}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy || undefined}
        data-editing={typed.editing || undefined}
        {...props}
        value={typed.text}
        onChange={(event) => typed.setText(event.target.value)}
        onBlur={(event) => {
          typed.commit()
          onBlur?.(event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) typed.onKeyDown(event)
        }}
      />
      {name && <input type='hidden' name={name} value={typed.value ?? ''} />}
    </>
  )
}
