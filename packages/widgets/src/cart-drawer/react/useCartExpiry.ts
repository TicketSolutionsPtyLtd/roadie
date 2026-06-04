'use client'

import { useCallback, useState } from 'react'

import { urgencyLevel } from '../core'
import { useCountdown } from './useCountdown'

export interface CartExpiryState {
  /** Seconds remaining, clamped at 0; null when there is no expiry. */
  remaining: number | null
  /** True once the hold has elapsed. */
  expired: boolean
  /** True while inside the warning window and not yet dismissed for this hold. */
  showWarning: boolean
  /** Dismiss the warning until the server issues a new expiresAtUtc. */
  dismissWarning: () => void
}

// Derives the expiry-modal state from the shared countdown. Core `urgencyLevel`
// already encodes the bands: 'danger' = the <120s warning window (>0), 'expired'
// = 0. The warning is one-shot per hold (keyed on expiresAtUtc) so a server-side
// extension re-arms it.
export function useCartExpiry(
  expiresAtUtc: string | undefined
): CartExpiryState {
  const remaining = useCountdown(expiresAtUtc)
  const level = urgencyLevel(remaining)
  const expired = level === 'expired'

  const [dismissedFor, setDismissedFor] = useState<string | undefined>(
    undefined
  )
  const dismissWarning = useCallback(() => {
    setDismissedFor(expiresAtUtc)
  }, [expiresAtUtc])

  const showWarning = level === 'danger' && dismissedFor !== expiresAtUtc

  return { remaining, expired, showWarning, dismissWarning }
}
