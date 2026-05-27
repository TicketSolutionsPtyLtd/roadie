'use client'

import { type CSSProperties, useMemo, useSyncExternalStore } from 'react'

import NumberFlow from '@number-flow/react'

import { Badge } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import { URGENCY_LONG_FORMAT_S, remainingSeconds, urgencyLevel } from '../core'

interface CartUrgencyBadgeProps {
  ticketCount: number
  expiresAtUtc: string | undefined
  /** Drawer open-state progress 0..1. Controls the "remaining to checkout" tail expansion. */
  progress?: number
  /** Fires the badge-pop keyframe once per add. Caller toggles via a keyed wrapper or passes a truthy signal. */
  bounce?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Live countdown backed by core `remainingSeconds`. `useSyncExternalStore`
 * drives the 1s tick; the snapshot recomputes against `Date.now()` each frame.
 */
function useCountdown(expiresAt: string | undefined): number | null {
  const subscribe = useMemo(() => {
    if (!expiresAt) return () => () => {}
    return (cb: () => void) => {
      const id = setInterval(cb, 1000)
      return () => clearInterval(id)
    }
  }, [expiresAt])

  const getSnapshot = () => remainingSeconds(expiresAt, Date.now())

  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

export function CartUrgencyBadge({
  ticketCount,
  expiresAtUtc,
  progress = 0,
  bounce = false,
  className,
  style
}: CartUrgencyBadgeProps) {
  const remaining = useCountdown(expiresAtUtc)

  // urgencyLevel maps remaining seconds → success/warning/danger/expired; the
  // badge only paints the three live intents (expired floors at 0:00 alongside
  // danger). Drives the Badge's coloured background + text via Roadie intents.
  const level = urgencyLevel(remaining)
  const intent: 'success' | 'warning' | 'danger' =
    level === 'expired' ? 'danger' : level

  const tailMaxWidth = Math.max(0, Math.min(1, progress)) * 200
  const tailOpacity = Math.max(0, Math.min(1, progress))

  const showCountdown = remaining !== null && remaining > 0

  return (
    <Badge
      intent={intent}
      emphasis='subtle'
      size='sm'
      indicator={showCountdown}
      indicatorPulse={showCountdown}
      className={cn(
        'gap-2 px-3 py-1',
        bounce && 'animate-badge-pop',
        className
      )}
      style={style}
    >
      <NumberFlow value={ticketCount} className='tabular-nums' />{' '}
      {ticketCount === 1 ? 'ticket' : 'tickets'}
      {showCountdown && remaining !== null && (
        <>
          {remaining > URGENCY_LONG_FORMAT_S ? (
            <span className='tabular-nums'>
              <NumberFlow value={Math.ceil(remaining / 60)} suffix=' mins' />
            </span>
          ) : (
            <span className='tabular-nums'>
              <NumberFlow value={Math.floor(remaining / 60)} />
              :
              <NumberFlow
                value={remaining % 60}
                format={{ minimumIntegerDigits: 2 }}
              />
            </span>
          )}
          <span
            className='overflow-hidden whitespace-nowrap'
            style={{
              maxWidth: tailMaxWidth,
              opacity: tailOpacity,
              transition: 'max-width 300ms ease-out, opacity 300ms ease-out'
            }}
          >
            remaining to checkout
          </span>
        </>
      )}
    </Badge>
  )
}
