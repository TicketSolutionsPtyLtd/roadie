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
  step: string | undefined
  /** The request that brought them, so a retry of the same text still loads. */
  request: number
  failed?: boolean
}

function requestKey(inputValue: string, step: string | undefined) {
  return `${step ?? ''}\u0000${inputValue}`
}

const NONE: readonly never[] = []
const NONE_YET: readonly never[] = []

function isThenable<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return value != null && typeof (value as PromiseLike<T>).then === 'function'
}

// Asks again when the text, the open state, the step (the pending field and
// its operator) or its version changes, not when `suggest` does, so an inline
// function doesn't loop. A new version keeps the step's suggestions meanwhile.
export function useSuggestions<Value>(
  suggest: Suggest<Value>,
  inputValue: string,
  open: boolean,
  step: string | undefined,
  version?: string
) {
  const suggestRef = useRef(suggest)
  useIsomorphicLayoutEffect(() => {
    suggestRef.current = suggest
  })
  const [suggestions, setSuggestions] = useState<Suggestions<Value>>({
    groups: NONE_YET,
    inputValue: '',
    step: undefined,
    request: 0
  })
  const [requested, setRequested] = useState<{ id: number; key: string }>()
  const requests = useRef(0)

  useIsomorphicLayoutEffect(() => {
    if (!open) return
    let current = true
    const request = ++requests.current
    const result = suggestRef.current(inputValue)
    if (!isThenable(result)) {
      setSuggestions({ groups: result, inputValue, step, request })
      setRequested(undefined)
      return
    }
    setRequested({ id: request, key: requestKey(inputValue, step) })
    result.then(
      (groups) => {
        if (current) setSuggestions({ groups, inputValue, step, request })
      },
      () => {
        if (current)
          setSuggestions({
            groups: NONE,
            inputValue,
            step,
            request,
            failed: true
          })
      }
    )
    return () => {
      current = false
    }
  }, [inputValue, open, step, version])

  // A new version of the same text keeps showing what it had; a retry after a
  // failure has nothing to show, so it loads.
  const waiting =
    requested !== undefined &&
    requested.id !== suggestions.request &&
    (suggestions.groups === NONE_YET ||
      suggestions.failed ||
      requested.key !== requestKey(suggestions.inputValue, suggestions.step))
  // Another step's suggestions never show while this step's load.
  return suggestions.step === step
    ? { ...suggestions, loading: waiting }
    : { ...suggestions, groups: NONE, loading: true }
}
