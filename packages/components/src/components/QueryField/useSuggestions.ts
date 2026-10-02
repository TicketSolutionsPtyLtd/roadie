'use client'

import { useEffect, useRef, useState } from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import type { QueryFieldSuggestionGroup } from './types'

type Suggest<Value> = (
  inputValue: string
) =>
  | readonly QueryFieldSuggestionGroup<Value>[]
  | Promise<readonly QueryFieldSuggestionGroup<Value>[]>

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
  const [groups, setGroups] =
    useState<readonly QueryFieldSuggestionGroup<Value>[]>(NONE)

  useEffect(() => {
    if (!open) return
    let current = true
    Promise.resolve(suggestRef.current(inputValue)).then((next) => {
      if (current) setGroups(next)
    })
    return () => {
      current = false
    }
  }, [inputValue, open, pendingId])

  return groups
}
