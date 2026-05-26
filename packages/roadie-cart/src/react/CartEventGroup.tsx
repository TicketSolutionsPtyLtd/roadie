'use client'

import { IconButton } from '@oztix/roadie-components'

import { type CartEvent, formatCurrency } from '../core'
import { ClockIcon, MapPinIcon } from './icons'

interface CartEventGroupProps {
  event: CartEvent
  /** Locale for currency/time formatting (design finding #1). */
  locale: string
  /** ISO 4217 currency code (design finding #1). */
  currency: string
  onRemove?: (eventId: string) => void
}

function formatTime(date: Date): string {
  const minutes = date.getMinutes()
  const hour = date.getHours()
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  if (minutes === 0) return `${h}${ampm}`
  return `${h}:${String(minutes).padStart(2, '0')}${ampm}`
}

export function CartEventGroup({
  event,
  locale,
  currency,
  onRemove
}: CartEventGroupProps) {
  // Time of day comes from the UTC start; eventDateDisplay (if provided) is the
  // pre-formatted venue-local string, otherwise we render the wall-clock time.
  const start = new Date(event.eventStartAtUtc)
  const startValid = !Number.isNaN(start.getTime())
  const timeLabel =
    event.eventDateDisplay ?? (startValid ? formatTime(start) : null)

  return (
    <div className='grid gap-3'>
      <div className='flex items-start gap-3'>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          {timeLabel && (
            <div className='flex items-center gap-2 text-ui-meta text-subtle'>
              <ClockIcon className='size-4 shrink-0 text-subtler' />
              <span>{timeLabel}</span>
            </div>
          )}
          <div className='grid gap-1 pl-6'>
            <p className='text-ui font-medium text-strong'>{event.eventName}</p>
            <div className='flex items-center gap-1.5 text-ui-meta text-subtle'>
              <MapPinIcon className='size-3.5 shrink-0 text-subtler' />
              <span>{event.venueName}</span>
            </div>
          </div>
        </div>
        {event.imageUrl && (
          // Plain <img>: CORS isn't needed for display, only that the URL is
          // absolute / resolvable from the consuming origin (design contract).
          <img
            src={event.imageUrl}
            alt={event.eventName}
            className='size-20 shrink-0 rounded-lg bg-subtle object-cover'
          />
        )}
        {onRemove && (
          <IconButton
            aria-label={`Remove ${event.eventName}`}
            emphasis='subtler'
            intent='danger'
            size='icon-sm'
            onClick={() => onRemove(event.eventId)}
          >
            <XIconTrash />
          </IconButton>
        )}
      </div>

      <div className='grid gap-2 pl-6'>
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

// Minimal trash glyph for the (currently unused) remove control.
function XIconTrash() {
  return (
    <svg
      viewBox='0 0 256 256'
      fill='currentColor'
      className='size-4'
      aria-hidden='true'
    >
      <path d='M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192Z' />
    </svg>
  )
}
