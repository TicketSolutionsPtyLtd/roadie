'use client'

import { useState } from 'react'

import { ClockIcon, MapPinIcon, TrashIcon } from '@phosphor-icons/react'

import { Button, IconButton, Popover } from '@oztix/roadie-components'

import {
  type CartEvent,
  formatCurrency,
  formatTime,
  isSafeImageUrl
} from '../core'

type CartEventGroupProps = {
  event: CartEvent
  /** Locale for currency/time formatting. */
  locale: string
  /** ISO 4217 currency code. */
  currency: string
  /** Optional remove handler. Receives the `eventId`. */
  onRemoveEvent?: (eventId: string) => void
  /** True while a remove is in flight — disables the trash trigger. */
  isRemoving?: boolean
}

export function CartEventGroup({
  event,
  locale,
  currency,
  onRemoveEvent,
  isRemoving = false
}: CartEventGroupProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const start = new Date(event.eventStartAtUtc)
  const startValid = !Number.isNaN(start.getTime())
  const timeLabel =
    event.eventDateDisplay ?? (startValid ? formatTime(start) : null)
  // Only render absolute http(s) image URLs — a hostile API could otherwise beacon viewers.
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
        {onRemoveEvent && (
          <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Popover.Trigger
              render={
                <IconButton
                  intent='danger'
                  emphasis='subtler'
                  size='sm'
                  disabled={isRemoving}
                  aria-label={`Remove ${event.eventName}`}
                >
                  <TrashIcon weight='bold' className='size-4' />
                </IconButton>
              }
            />
            <Popover.Content>
              <Popover.Header>
                <Popover.Title>
                  Remove all tickets for this event?
                </Popover.Title>
              </Popover.Header>
              <Popover.Footer>
                <Popover.Close
                  render={
                    <Button intent='neutral' emphasis='normal' size='sm'>
                      Cancel
                    </Button>
                  }
                />
                <Button
                  intent='danger'
                  emphasis='strong'
                  size='sm'
                  onClick={() => {
                    onRemoveEvent(event.eventId)
                    setConfirmOpen(false)
                  }}
                >
                  Remove
                </Button>
              </Popover.Footer>
            </Popover.Content>
          </Popover>
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
