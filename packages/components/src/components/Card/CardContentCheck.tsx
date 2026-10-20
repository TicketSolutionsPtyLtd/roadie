'use client'

import {
  type ReactNode,
  type RefObject,
  createContext,
  use,
  useEffect,
  useRef
} from 'react'

const CardContentContext = createContext<RefObject<number> | null>(null)

/** Development only: warns after mount when no `Card.Content` registered inside this card. */
export function CardContentCheck({ children }: { children?: ReactNode }) {
  const contentCountRef = useRef(0)
  const warnedRef = useRef(false)
  // Child effects run first, so every Content has registered by now.
  useEffect(() => {
    if (contentCountRef.current > 0 || warnedRef.current) return
    warnedRef.current = true
    console.warn(
      '[Roadie] Card has no Card.Content. Put its body there, even a lone title and description, since Card.Header has no bottom padding.'
    )
  }, [])
  return (
    <CardContentContext value={contentCountRef}>{children}</CardContentContext>
  )
}

/** Development only: registers a `Card.Content` with the card around it. */
export function CardContentMarker() {
  const contentCountRef = use(CardContentContext)
  useEffect(() => {
    if (!contentCountRef) return
    contentCountRef.current += 1
    return () => {
      contentCountRef.current -= 1
    }
  }, [contentCountRef])
  return null
}
