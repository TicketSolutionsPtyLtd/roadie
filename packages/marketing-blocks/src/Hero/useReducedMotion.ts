import { useSyncExternalStore } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * True when the viewer asks for less motion. The server, and hydration, assume
 * they do, so nothing moves until the client has read the real preference.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true
  )
}
