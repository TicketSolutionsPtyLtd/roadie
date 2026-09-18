'use client'

import { useEffect, useRef, useState } from 'react'

import { usePendingNavigationSnapshot } from '../../providers/PendingNavigationContext'

/** `visible` draws the indicator, `leaving` fades it out, `idle` draws nothing. */
export type FramePendingState = 'idle' | 'visible' | 'leaving'

// PENDING_FADE matches the sheet's --duration-moderate, which the pull-back shares.
export const PENDING_ARM = 150
export const PENDING_MINIMUM = 600
export const PENDING_FADE = 200

/** Draws nothing for a wait under PENDING_ARM; once drawn, holds PENDING_MINIMUM so it pulses, not flickers. */
export function useFramePending(enabled: boolean): FramePendingState {
  const navigation = usePendingNavigationSnapshot(enabled)
  const waiting = navigation !== null

  const [state, setState] = useState<FramePendingState>('idle')
  const shownAt = useRef(0)
  const startedAt = navigation?.startedAt

  useEffect(() => {
    if (waiting) {
      if (state === 'visible') return
      // A click during the fade revives it and restarts the minimum.
      if (state === 'leaving') {
        let live = true
        queueMicrotask(() => {
          if (!live) return
          shownAt.current = Date.now()
          setState('visible')
        })
        return () => {
          live = false
        }
      }
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

  // Keyed on `waiting`, so a click mid-fade cancels the unmount rather than racing it.
  useEffect(() => {
    if (state !== 'leaving' || waiting) return
    const gone = setTimeout(() => setState('idle'), PENDING_FADE)
    return () => clearTimeout(gone)
  }, [state, waiting])

  return state
}
