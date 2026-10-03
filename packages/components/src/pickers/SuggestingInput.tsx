'use client'

import {
  type ComponentProps,
  type KeyboardEvent,
  type RefObject,
  useState
} from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import type { BaseUIEvent } from '@base-ui/react/types'

import { Autocomplete } from '../components/Autocomplete'
import { Kbd } from '../components/Kbd'
import { mergeRefs } from '../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect'
import { type TypedInputProps, useTypedInput } from './TypedInput'

export type TypedSuggestion = {
  key: string
  label: string
  description?: string
}

export type SuggestingInputProps<
  T = string,
  S extends TypedSuggestion = TypedSuggestion
> = TypedInputProps<T> & {
  /** Suggestions for the text as typed; empty text gets hints. */
  suggest: (text: string) => readonly S[]
  onChoose: (suggestion: S) => void
  /** What the list lines up with. Defaults to the input. */
  anchor?: RefObject<HTMLElement | null>
}

// A reading that throws, such as on a bad weekStart, shows no list rather
// than breaking the page as the field is focused.
function suggestSafely<S>(
  suggest: (text: string) => readonly S[],
  text: string
): readonly S[] {
  try {
    return suggest(text)
  } catch {
    return []
  }
}

/**
 * A typed input as an autocomplete: hints while empty, suggestions as text is
 * typed, the first highlighted once typing starts so Enter takes it.
 */
export function SuggestingInput<
  T = string,
  S extends TypedSuggestion = TypedSuggestion
>({
  suggest,
  onChoose,
  anchor,
  ref,
  onFocus,
  onKeyDown,
  ...props
}: SuggestingInputProps<T, S>) {
  const { inputRef, inputProps, hiddenInput } = useTypedInput(props)
  const { typed } = props
  const { disabled, readOnly } = inputProps
  // Base UI re-merges its refs as the list changes, which would detach and
  // reattach a callback ref on every keystroke; this attaches it once.
  useIsomorphicLayoutEffect(
    () => mergeRefs(ref)(inputRef.current),
    [ref, inputRef]
  )
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState<S>()
  const items = open ? suggestSafely(suggest, typed.text) : []
  const shown = open && items.length > 0
  // Base UI reports no close for a list it never showed, so a wish to open
  // left by text with nothing to suggest would open it later, unasked.
  if (open && !shown) setOpen(false)

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
    <>
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
          {...(inputProps as ComponentProps<'input'>)}
          ref={inputRef}
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
      {hiddenInput}
    </>
  )
}
