'use client'

import { useCallback, useState } from 'react'

import { urgencyLevel } from '../../cart'
import { useCountdown } from '../../cart-contents/react/useCountdown'

export interface CartExpiryState {
  remaining: number | null
  expired: boolean
  showWarning: boolean
  dismissWarning: () => void
}

// One-shot warning keyed on expiresAtUtc — a server-side extension re-arms it.
// Core urgencyLevel encodes the bands ('danger' = warning window, 'expired' = 0).
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
