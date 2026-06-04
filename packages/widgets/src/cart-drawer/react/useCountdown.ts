'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { remainingSeconds } from '../core'

// Live cart countdown backed by core `remainingSeconds`. useSyncExternalStore
// drives the 1s tick; the snapshot recomputes against Date.now() each frame.
// Shared by CartUrgencyBadge (display) and useCartExpiry (warning/expired state).
export function useCountdown(expiresAt: string | undefined): number | null {
  const subscribe = useMemo(() => {
    if (!expiresAt) return () => () => {}
    return (cb: () => void) => {
      const id = setInterval(cb, 1000)
      return () => clearInterval(id)
    }
  }, [expiresAt])

  return useSyncExternalStore(
    subscribe,
    () => remainingSeconds(expiresAt, Date.now()),
    () => null
  )
}
