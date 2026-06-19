'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'

import NumberFlow from '@number-flow/react'
import { TicketIcon } from '@phosphor-icons/react'
import { AnimatePresence, m } from 'motion/react'

import { Badge } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import { URGENCY_LONG_FORMAT_S, urgencyLevel } from '../core'
import { useCountdown } from './useCountdown'

// Coarse so the live region doesn't announce every second.
function coarseUrgencyMessage(remaining: number | null): string {
  const level = urgencyLevel(remaining)
  if (level === 'expired') return 'Cart expired'
  if (remaining === null) return ''
  if (level === 'danger') return 'Cart expiring soon'
  const minutes = Math.ceil(remaining / 60)
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} remaining to checkout`
}

type CartUrgencyBadgeProps = {
  ticketCount: number
  expiresAtUtc: string | undefined
  /** Drawer open-state progress 0..1. Controls the tail expansion. */
  progress?: number
  /** Fires the animate-pop cue once per add. */
  bounce?: boolean
  className?: string
  style?: CSSProperties
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

  const level = urgencyLevel(remaining)
  const intent: 'success' | 'warning' | 'danger' =
    level === 'expired' ? 'danger' : level

  // Announce only at coarse transitions, not every second.
  const minuteBucket = remaining === null ? null : Math.ceil(remaining / 60)
  const [announcement, setAnnouncement] = useState('')
  const lastKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const key = `${level}:${minuteBucket}`
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key
    setAnnouncement(coarseUrgencyMessage(remaining))
  }, [level, minuteBucket, remaining])

  const tailMaxWidth = Math.max(0, Math.min(1, progress)) * 200
  const tailOpacity = Math.max(0, Math.min(1, progress))

  const showCountdown = ticketCount > 0 && remaining !== null && remaining > 0

  return (
    <div className='flex items-center' style={style}>
      <span className='sr-only' aria-live='polite' aria-atomic='true'>
        {announcement}
      </span>
      <Badge size='sm' className={cn(bounce && 'animate-pop', className)}>
        <TicketIcon weight='bold' />
        <span className='tabular-nums'>
          <NumberFlow value={ticketCount} />
        </span>
      </Badge>
      {/* Collapse width + the leading gap so the badge clears smoothly when the
         cart empties or the countdown expires. marginLeft holds the gap-1.5. */}
      <AnimatePresence initial={false}>
        {showCountdown && remaining !== null && (
          <m.div
            key='time'
            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, width: 'auto', marginLeft: 6 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className='overflow-hidden'
          >
            <Badge
              intent={intent}
              size='sm'
              indicator
              indicatorPulse
              className={className}
            >
              {remaining > URGENCY_LONG_FORMAT_S ? (
                <span className='tabular-nums'>
                  <NumberFlow
                    value={Math.ceil(remaining / 60)}
                    suffix=' mins'
                  />
                </span>
              ) : (
                <span className='flex items-baseline gap-1 tabular-nums'>
                  <span>
                    <NumberFlow value={Math.floor(remaining / 60)} />:
                    <NumberFlow
                      value={remaining % 60}
                      format={{ minimumIntegerDigits: 2 }}
                    />
                  </span>
                  <span
                    className='overflow-hidden whitespace-nowrap'
                    style={{
                      maxWidth: tailMaxWidth,
                      opacity: tailOpacity,
                      transition:
                        'max-width 300ms ease-out, opacity 300ms ease-out'
                    }}
                  >
                    remaining to checkout
                  </span>
                </span>
              )}
            </Badge>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
