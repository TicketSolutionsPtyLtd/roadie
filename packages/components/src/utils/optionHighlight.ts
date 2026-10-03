'use client'

import { createContext, useState } from 'react'

export const PointerHighlightContext = createContext(false)

// A tapped option stays highlighted while the list stays open, so a highlight
// the pointer made only fills where the pointer can hover.
export function optionHighlightClass(byPointer: boolean) {
  return byPointer
    ? '[@media(hover:hover)]:data-[highlighted]:bg-subtle'
    : 'data-[highlighted]:bg-subtle'
}

export function usePointerHighlight<Args extends [unknown, { reason: string }]>(
  onItemHighlighted?: (...args: Args) => void
) {
  const [byPointer, setByPointer] = useState(false)
  function handleItemHighlighted(...args: Args) {
    setByPointer(args[1].reason === 'pointer')
    onItemHighlighted?.(...args)
  }
  return [byPointer, handleItemHighlighted] as const
}

type QueryChangeDetails = { reason: string; event: Event; isCanceled: boolean }

// Mirrors Base UI's own test: autofill isn't typing.
function isTyping(event: Event) {
  if (event.type === 'compositionend') return true
  const { inputType } = event as InputEvent
  return !!inputType && inputType !== 'insertReplacementText'
}

// Base UI's `true` misses results that arrive after typing and its 'always'
// highlights with no query, so drive 'always' only while the user has typed
// text since the list opened.
export function useTypedQuery(open: boolean | undefined) {
  const [query, setQuery] = useState('')
  if (open === false && query !== '') setQuery('')
  function handleQueryChange(text: string, details: QueryChangeDetails) {
    if (details.isCanceled || details.reason !== 'input-change') return
    setQuery(isTyping(details.event) ? text.trim() : '')
  }
  function resetTyped(details: { isCanceled: boolean }) {
    if (!details.isCanceled) setQuery('')
  }
  return { typed: query !== '', query, handleQueryChange, resetTyped }
}
