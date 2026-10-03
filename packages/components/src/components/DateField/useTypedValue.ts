'use client'

import { type KeyboardEvent, useState } from 'react'

import type { ReadResult } from './readDate'

export type TypedValueOptions = {
  value: string | null | undefined
  defaultValue: string | null | undefined
  onValueChange: ((value: string | null) => void) | undefined
  format: (value: string) => string
  read: (text: string) => ReadResult
}

/**
 * Text that commits to a value on blur or Enter. Until then the typed text is
 * a draft; text that names no value stays on screen with an error, and the
 * value becomes null so nothing stale is submitted.
 */
export function useTypedValue({
  value: valueProp,
  defaultValue,
  onValueChange,
  format,
  read
}: TypedValueOptions) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? null)
  const value = valueProp !== undefined ? valueProp : uncontrolled
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The value before unreadable text made it null, for Escape to put back.
  const [beforeError, setBeforeError] = useState<string | null>()
  // A value from outside replaces the draft; the one just emitted does not.
  const [sync, setSync] = useState<{
    seen: string | null
    emitted: string | null | undefined
  }>({ seen: value, emitted: undefined })
  if (sync.seen !== value) {
    setSync({ seen: value, emitted: undefined })
    if (value !== sync.emitted) {
      setDraft(null)
      setError(null)
      setBeforeError(undefined)
    }
  }

  function emit(next: string | null) {
    if (next === value) return
    setSync((current) => ({ ...current, emitted: next }))
    if (valueProp === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  function setValue(next: string | null) {
    setDraft(null)
    setError(null)
    setBeforeError(undefined)
    emit(next)
  }

  /** The value the draft commits to, or undefined when it can't be read. */
  function commit(): string | null | undefined {
    if (draft === null) return value
    const result = read(draft)
    if ('error' in result) {
      setError(result.error)
      if (error === null) setBeforeError(value)
      emit(null)
      return undefined
    }
    setValue(result.value)
    return result.value
  }

  /** What the draft would commit to, or undefined when it can't be read. */
  function draftValue(): string | null | undefined {
    if (draft === null) return value
    const result = read(draft)
    return 'error' in result ? undefined : result.value
  }

  function revert() {
    if (beforeError !== undefined) setValue(beforeError)
    else {
      setDraft(null)
      setError(null)
    }
  }

  /** Enter and Escape act on a draft and are left alone otherwise. */
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      draft === null ||
      event.nativeEvent.isComposing ||
      // Safari's composing keydown can say it isn't, but carries 229.
      event.keyCode === 229
    )
      return
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      revert()
    }
  }

  return {
    value,
    text: draft ?? (value ? format(value) : ''),
    editing: draft !== null,
    error,
    setText: setDraft,
    setValue,
    commit,
    draftValue,
    onKeyDown
  }
}
