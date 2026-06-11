'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { remainingSeconds } from '../core'

// Ticks once a second via useSyncExternalStore (avoids useEffect + setState).
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
