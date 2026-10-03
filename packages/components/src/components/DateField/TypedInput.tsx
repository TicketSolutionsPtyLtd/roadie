'use client'

import { type ComponentProps, useRef } from 'react'

import { flushSync } from 'react-dom'

import { mergeRefs } from '../../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { useFieldContext } from '../Field'
import type { useTypedValue } from './useTypedValue'

export type TypedInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'disabled' | 'type'
> & {
  typed: ReturnType<typeof useTypedValue>
  disabled?: boolean
  invalid?: boolean
}

/** A text input wired to a typed value and the surrounding `Field`. */
export function TypedInput({
  typed,
  disabled,
  invalid,
  name,
  ref,
  form,
  'aria-describedby': ariaDescribedBy,
  id,
  required,
  onBlur,
  onKeyDown,
  ...props
}: TypedInputProps) {
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

  return (
    <>
      <input
        type='text'
        autoComplete='off'
        spellCheck={false}
        id={id ?? (field.fieldId || undefined)}
        form={form}
        disabled={isDisabled}
        required={isRequired}
        aria-required={isRequired || undefined}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        data-editing={typed.editing || undefined}
        {...props}
        ref={mergeRefs(inputRef, ref)}
        value={typed.text}
        onChange={(event) => typed.setText(event.target.value)}
        onBlur={(event) => {
          // Flushed, so an onBlur that submits the form sees the result.
          flushSync(() => typed.commit())
          onBlur?.(event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) typed.onKeyDown(event)
        }}
      />
      {name && (
        <input
          type='hidden'
          name={name}
          form={form}
          disabled={isDisabled}
          value={typed.error ? '' : (typed.value ?? '')}
        />
      )}
    </>
  )
}
