'use client'

import { useRef, useState } from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import type { QueryFieldSuggestionGroup } from './types'

type Suggest<Value> = (
  inputValue: string
) =>
  | readonly QueryFieldSuggestionGroup<Value>[]
  | Promise<readonly QueryFieldSuggestionGroup<Value>[]>

type Suggestions<Value> = {
  groups: readonly QueryFieldSuggestionGroup<Value>[]
  /** The text these groups were asked for. */
  inputValue: string
  pendingId: string | undefined
}

function requestKey(inputValue: string, pendingId: string | undefined) {
  return `${pendingId ?? ''}\u0000${inputValue}`
}

const NONE: readonly never[] = []
const NONE_YET: readonly never[] = []

function isThenable<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return value != null && typeof (value as PromiseLike<T>).then === 'function'
}

// Asks again when the text, the open state or the pending field changes, not
// when `suggest` does, so an inline function doesn't loop.
export function useSuggestions<Value>(
  suggest: Suggest<Value>,
  inputValue: string,
  open: boolean,
  pendingId: string | undefined
) {
  const suggestRef = useRef(suggest)
  useIsomorphicLayoutEffect(() => {
    suggestRef.current = suggest
  })
  const [suggestions, setSuggestions] = useState<Suggestions<Value>>({
    groups: NONE_YET,
    inputValue: '',
    pendingId: undefined
  })
  const [requested, setRequested] = useState<string>()

  useIsomorphicLayoutEffect(() => {
    if (!open) return
    let current = true
    const result = suggestRef.current(inputValue)
    if (!isThenable(result)) {
      setSuggestions({ groups: result, inputValue, pendingId })
      setRequested(undefined)
      return
    }
    setRequested(requestKey(inputValue, pendingId))
    result.then(
      (groups) => {
        if (current) setSuggestions({ groups, inputValue, pendingId })
      },
      () => {
        if (current) setSuggestions({ groups: NONE, inputValue, pendingId })
      }
    )
    return () => {
      current = false
    }
  }, [inputValue, open, pendingId])

  const waiting =
    requested !== undefined &&
    (suggestions.groups === NONE_YET ||
      requested !== requestKey(suggestions.inputValue, suggestions.pendingId))
  // Another step's suggestions never show while this step's load.
  return suggestions.pendingId === pendingId
    ? { ...suggestions, loading: waiting }
    : { ...suggestions, groups: NONE, loading: true }
}
