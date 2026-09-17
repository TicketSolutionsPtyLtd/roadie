'use client'

import { useEffect, useRef, useState } from 'react'

import { usePendingNavigation } from '../../providers/PendingNavigationContext'

/** `visible` draws the indicator, `leaving` fades it out, `idle` draws nothing. */
export type FramePendingState = 'idle' | 'visible' | 'leaving'

// PENDING_FADE is the sheet's --duration-moderate, and the phone pull-back
// transitions over the same token so the two end together. The other two are
// this hook's alone; the sheet has no counterpart for them.
export const PENDING_ARM = 150
export const PENDING_MINIMUM = 600
export const PENDING_FADE = 200

/**
 * A wait shorter than {@link PENDING_ARM} draws nothing, and one that does draw
 * stays {@link PENDING_MINIMUM} so it reads as a pulse rather than a flicker.
 */
export function useFramePending(enabled: boolean): FramePendingState {
  const navigation = usePendingNavigation(enabled)
  const waiting = navigation !== null

  const [state, setState] = useState<FramePendingState>('idle')
  const shownAt = useRef(0)
  const startedAt = navigation?.startedAt

  useEffect(() => {
    if (waiting) {
      if (state === 'visible') return
      // A second click during the fade revives the indicator immediately.
      // Restart its minimum so the new wait reads as a complete response.
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

  // `waiting`, so a click landing mid-fade cancels the unmount rather than
  // racing it: the indicator has to come back without leaving first.
  useEffect(() => {
    if (state !== 'leaving' || waiting) return
    const gone = setTimeout(() => setState('idle'), PENDING_FADE)
    return () => clearTimeout(gone)
  }, [state, waiting])

  return state
}
