'use client'

import { ClockIcon, MapPinIcon } from '@phosphor-icons/react'

import {
  type CartEvent,
  formatCurrency,
  formatTime,
  isSafeImageUrl
} from '../core'

type CartEventGroupProps = {
  event: CartEvent
  /** Locale for currency/time formatting (design finding #1). */
  locale: string
  /** ISO 4217 currency code (design finding #1). */
  currency: string
}

export function CartEventGroup({
  event,
  locale,
  currency
}: CartEventGroupProps) {
  // Time of day comes from the UTC start; eventDateDisplay (if provided) is the
  // pre-formatted venue-local string, otherwise we render the wall-clock time.
  const start = new Date(event.eventStartAtUtc)
  const startValid = !Number.isNaN(start.getTime())
  const timeLabel =
    event.eventDateDisplay ?? (startValid ? formatTime(start) : null)
  // Only render API-supplied images from absolute http(s) URLs — a hostile API
  // could otherwise beacon viewers via a protocol-relative tracking pixel.
  const safeImageUrl = isSafeImageUrl(event.imageUrl) ? event.imageUrl : null

  return (
    <div className='grid gap-3'>
      <div className='flex items-start gap-3'>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          {timeLabel && (
            <div className='flex items-center gap-2 text-ui-meta text-subtle'>
              <ClockIcon
                weight='bold'
                className='size-4 shrink-0 text-subtler'
              />
              <span>{timeLabel}</span>
            </div>
          )}
          <div className='grid gap-1 pl-6'>
            <p className='text-ui font-medium text-strong'>{event.eventName}</p>
            <div className='flex items-center gap-1.5 text-ui-meta text-subtle'>
              <MapPinIcon
                weight='bold'
                className='size-3.5 shrink-0 text-subtler'
              />
              <span>{event.venueName}</span>
            </div>
          </div>
        </div>
        {safeImageUrl && (
          <img
            src={safeImageUrl}
            alt={event.eventName}
            className='size-20 shrink-0 rounded-lg bg-subtle object-cover'
          />
        )}
      </div>

      <div className='grid gap-3 pl-6'>
        {event.tickets.map((ticket) => (
          <div key={ticket.name} className='grid gap-2'>
            <div className='md:hidden'>
              <p className='text-ui font-medium text-strong'>{ticket.name}</p>
            </div>
            <div className='flex items-center rounded-lg bg-sunken px-3 py-2'>
              <div className='hidden min-w-0 flex-1 pr-4 md:block'>
                <span className='block truncate text-ui font-medium text-strong'>
                  {ticket.name}
                </span>
              </div>
              <span className='w-20 shrink-0 text-ui-meta text-subtle'>
                {ticket.priceEach === 0
                  ? 'Free'
                  : formatCurrency(ticket.priceEach, { locale, currency })}
              </span>
              <div className='flex flex-1 items-center justify-center'>
                <span className='shrink-0 text-ui-meta font-medium text-strong'>
                  &times; {ticket.quantity}
                </span>
              </div>
              <span className='w-24 shrink-0 text-right text-ui font-bold text-strong tabular-nums'>
                {formatCurrency(ticket.quantity * ticket.priceEach, {
                  locale,
                  currency
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
