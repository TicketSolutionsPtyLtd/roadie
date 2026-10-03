'use client'

import { type ComponentProps, type FocusEvent, useRef } from 'react'

import { flushSync } from 'react-dom'

import { useFieldContext } from '../components/Field'
import { mergeRefs } from '../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect'
import type { TypedValue } from './useTypedValue'

export type TypedInputProps<T = string> = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'disabled' | 'type'
> & {
  typed: TypedValue<T>
  /** What a `name`d form submits for the value. Defaults to `String`. */
  formValue?: (value: T) => string
  disabled?: boolean
  invalid?: boolean
}

/**
 * The attributes a typed input takes from its value and the surrounding
 * `Field`, and the hidden input a `name`d form submits.
 */
export function useTypedInput<T>({
  typed,
  formValue = String,
  disabled,
  invalid,
  name,
  form,
  'aria-describedby': ariaDescribedBy,
  id,
  required,
  readOnly,
  onBlur,
  ...props
}: Omit<TypedInputProps<T>, 'ref' | 'onFocus' | 'onKeyDown'>) {
  const field = useFieldContext()
  const inputRef = useRef<HTMLInputElement>(null)
  // The text box holds unreadable text, so required alone would let a form
  // submit; the parse error blocks it as native validation.
  useIsomorphicLayoutEffect(() => {
    inputRef.current?.setCustomValidity(typed.error ?? '')
  }, [typed.error])
  const isInvalid = !!typed.error || (invalid ?? field.invalid)
  const describedBy =
    [isInvalid ? field.errorTextId : field.helperTextId, ariaDescribedBy]
      .filter(Boolean)
      .join(' ') || undefined
  const isRequired = required ?? field.required
  const isDisabled = disabled || field.disabled || undefined

  const inputProps = {
    type: 'text',
    autoComplete: 'off',
    spellCheck: false,
    id: id ?? (field.fieldId || undefined),
    form,
    disabled: isDisabled,
    readOnly,
    required: isRequired,
    'aria-required': isRequired || undefined,
    'aria-invalid': isInvalid || undefined,
    'aria-describedby': describedBy,
    'data-editing': typed.editing || undefined,
    ...props,
    onBlur: (event: FocusEvent<HTMLInputElement>) => {
      // Flushed, so an onBlur that submits the form sees the result.
      if (typed.editing) flushSync(() => typed.commit())
      onBlur?.(event)
    }
  }

  const hiddenInput = name && (
    <input
      type='hidden'
      name={name}
      form={form}
      disabled={isDisabled}
      value={typed.error || typed.value === null ? '' : formValue(typed.value)}
    />
  )
  return { inputRef, inputProps, hiddenInput }
}

/** A text input wired to a typed value and the surrounding `Field`. */
export function TypedInput<T = string>({
  ref,
  onFocus,
  onKeyDown,
  ...props
}: TypedInputProps<T>) {
  const { inputRef, inputProps, hiddenInput } = useTypedInput(props)
  const { typed } = props
  return (
    <>
      <input
        {...inputProps}
        ref={mergeRefs(inputRef, ref)}
        value={typed.text}
        onChange={(event) => typed.setText(event.target.value)}
        onFocus={onFocus}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) typed.onKeyDown(event)
        }}
      />
      {hiddenInput}
    </>
  )
}
