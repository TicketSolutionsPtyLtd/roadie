'use client'

import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useRef,
  useState
} from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import type { BaseUIEvent } from '@base-ui/react/types'
import { flushSync } from 'react-dom'

import { Autocomplete } from '../components/Autocomplete'
import { useFieldContext } from '../components/Field'
import { Kbd } from '../components/Kbd'
import { mergeRefs } from '../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect'
import type { TypedValue } from './useTypedValue'

export type TypedSuggestion = {
  key: string
  label: string
  description?: string
}

export type TypedSuggestions<S extends TypedSuggestion = TypedSuggestion> = {
  /** Suggestions for the text as typed; empty text gets hints. */
  suggest: (text: string) => readonly S[]
  onChoose: (suggestion: S) => void
  /** What the list lines up with. Defaults to the input. */
  anchor?: RefObject<HTMLElement | null>
}

export type TypedInputProps<
  T = string,
  S extends TypedSuggestion = TypedSuggestion
> = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'disabled' | 'type'
> & {
  typed: TypedValue<T>
  /** What a `name`d form submits for the value. Defaults to `String`. */
  formValue?: (value: T) => string
  disabled?: boolean
  invalid?: boolean
  /** Offers a list to choose from as the text is typed. */
  suggestions?: TypedSuggestions<S>
}

/** A text input wired to a typed value and the surrounding `Field`. */
export function TypedInput<
  T = string,
  S extends TypedSuggestion = TypedSuggestion
>({
  typed,
  formValue = String,
  disabled,
  invalid,
  suggestions,
  name,
  ref,
  form,
  'aria-describedby': ariaDescribedBy,
  id,
  required,
  readOnly,
  onBlur,
  onFocus,
  onKeyDown,
  ...props
}: TypedInputProps<T, S>) {
  const field = useFieldContext()
  const inputRef = useRef<HTMLInputElement>(null)
  // The text box holds unreadable text, so required alone would let a form
  // submit; the parse error blocks it as native validation.
  useIsomorphicLayoutEffect(() => {
    inputRef.current?.setCustomValidity(typed.error ?? '')
  }, [typed.error])
  // Base UI re-merges its refs as the list changes, which would detach and
  // reattach a callback ref on every keystroke; this attaches it once.
  const suggesting = !!suggestions
  useIsomorphicLayoutEffect(() => {
    if (suggesting) return mergeRefs(ref)(inputRef.current)
  }, [ref, suggesting])
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

  return (
    <>
      {suggestions ? (
        <SuggestingInput
          ref={inputRef}
          typed={typed}
          suggestions={suggestions}
          inputProps={inputProps}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
        />
      ) : (
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
      )}
      {name && (
        <input
          type='hidden'
          name={name}
          form={form}
          disabled={isDisabled}
          value={
            typed.error || typed.value === null ? '' : formValue(typed.value)
          }
        />
      )}
    </>
  )
}

type SuggestingInputProps<T, S extends TypedSuggestion> = {
  ref: RefObject<HTMLInputElement | null>
  typed: TypedValue<T>
  suggestions: TypedSuggestions<S>
  inputProps: ComponentProps<'input'>
  onFocus: ComponentProps<'input'>['onFocus']
  onKeyDown: ComponentProps<'input'>['onKeyDown']
}

/**
 * The input as an autocomplete: hints while empty, suggestions as text is
 * typed, the first highlighted once typing starts so Enter takes it.
 */
function SuggestingInput<T, S extends TypedSuggestion>({
  ref,
  typed,
  suggestions: { suggest, onChoose, anchor },
  inputProps,
  onFocus,
  onKeyDown
}: SuggestingInputProps<T, S>) {
  const { disabled, readOnly } = inputProps
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState<S>()
  const items = open ? suggest(typed.text) : []
  const shown = open && items.length > 0

  function handleKeyDown(event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    // The list takes Escape, and Enter on a highlighted suggestion.
    if (
      shown &&
      (event.key === 'Escape' || (event.key === 'Enter' && highlighted))
    )
      return
    // Closed, Base UI's Escape empties the text; the draft's own Escape
    // puts back the value instead.
    if (event.key === 'Escape') event.preventBaseUIHandler()
    typed.onKeyDown(event)
  }

  return (
    <Autocomplete
      items={items}
      filter={null}
      value={typed.text}
      onValueChange={(text, details) => {
        if (details.reason === 'input-change') typed.setText(text)
      }}
      open={shown}
      onOpenChange={(next) => setOpen(next && !readOnly)}
      onItemHighlighted={(item) => setHighlighted(item as S | undefined)}
      itemToStringValue={(item) => (item as S).label}
      disabled={disabled}
      readOnly={readOnly}
    >
      <AutocompletePrimitive.Input
        {...inputProps}
        ref={ref}
        onFocus={(event) => {
          onFocus?.(event)
          if (!readOnly && !typed.text.trim()) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner anchor={anchor} align='start'>
          <Autocomplete.Popup>
            <Autocomplete.List>
              {(item: S) => (
                <Autocomplete.Item
                  key={item.key}
                  value={item}
                  onClick={() => onChoose(item)}
                >
                  <span className='grid min-w-0 gap-0.5'>
                    <span className='truncate'>{item.label}</span>
                    {item.description && (
                      <span className='truncate text-xs text-subtle'>
                        {item.description}
                      </span>
                    )}
                  </span>
                  {shown && highlighted?.key === item.key && (
                    <Kbd size='sm' aria-hidden className='text-subtle'>
                      Enter
                    </Kbd>
                  )}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete>
  )
}
