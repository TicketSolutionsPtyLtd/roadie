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
