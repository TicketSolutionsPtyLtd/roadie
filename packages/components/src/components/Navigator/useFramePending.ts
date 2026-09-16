'use client'

import { useEffect, useRef, useState } from 'react'

import { usePendingNavigation } from '../../providers/PendingNavigationContext'

/** `visible` draws the indicator, `leaving` fades it out, `idle` draws nothing. */
export type FramePendingState = 'idle' | 'visible' | 'leaving'

// The sheet reads the same three tokens: --duration-normal, --duration-slowest
// and --duration-moderate. Changing one here means changing it there.
export const PENDING_ARM = 150
export const PENDING_MINIMUM = 600
export const PENDING_FADE = 200

/**
 * A wait shorter than {@link PENDING_ARM} draws nothing, and one that does draw
 * stays {@link PENDING_MINIMUM} so it reads as a pulse rather than a flicker.
 */
export function useFramePending(enabled: boolean): FramePendingState {
  const navigation = usePendingNavigation()
  const waiting = enabled && navigation !== null

  const [state, setState] = useState<FramePendingState>('idle')
  const shownAt = useRef(0)
  const startedAt = navigation?.startedAt

  useEffect(() => {
    if (waiting) {
      if (state === 'visible') return
      const now = Date.now()
      const arm = setTimeout(
        () => {
          shownAt.current = Date.now()
          setState('visible')
        },
        Math.max(0, (startedAt ?? now) + PENDING_ARM - now)
      )
      return () => clearTimeout(arm)
    }
    if (state !== 'visible') return
    const hold = setTimeout(
      () => setState('leaving'),
      Math.max(0, shownAt.current + PENDING_MINIMUM - Date.now())
    )
    return () => clearTimeout(hold)
  }, [waiting, startedAt, state])

  useEffect(() => {
    if (state !== 'leaving') return
    const gone = setTimeout(() => setState('idle'), PENDING_FADE)
    return () => clearTimeout(gone)
  }, [state])

  return state
}
