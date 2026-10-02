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
}

const NONE: readonly never[] = []

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
    groups: NONE,
    inputValue: ''
  })

  useIsomorphicLayoutEffect(() => {
    if (!open) return
    let current = true
    const result = suggestRef.current(inputValue)
    if (!(result instanceof Promise)) {
      setSuggestions({ groups: result, inputValue })
      return
    }
    result.then(
      (groups) => {
        if (current) setSuggestions({ groups, inputValue })
      },
      () => {
        if (current) setSuggestions({ groups: NONE, inputValue })
      }
    )
    return () => {
      current = false
    }
  }, [inputValue, open, pendingId])

  return suggestions
}
