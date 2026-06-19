'use client'

import { useState } from 'react'

import {
  ClockIcon,
  MapPinIcon,
  SeatIcon,
  TicketIcon,
  TrashIcon
} from '@phosphor-icons/react'

import { Badge, Button, IconButton, Popover } from '@oztix/roadie-components'

import {
  type CartEvent,
  formatCurrency,
  formatEventSchedule,
  formatSeatRange,
  isSafeImageUrl
} from '../../cart'

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
  const timeLabel =
    event.eventDateDisplay ?? formatEventSchedule(event, { locale })
  // Only render absolute http(s) image URLs — a hostile API could otherwise beacon viewers.
  const safeImageUrl = isSafeImageUrl(event.imageUrl) ? event.imageUrl : null

  return (
    <div className='grid gap-3'>
      <div className='flex items-start gap-1'>
        <div className='flex min-w-0 flex-1 flex-col gap-2'>
          {timeLabel && (
            <div className='flex items-center gap-2 text-ui-meta font-medium text-subtle'>
              <ClockIcon
                weight='bold'
                className='size-4 shrink-0 text-subtler'
              />
              <span>{timeLabel}</span>
            </div>
          )}
          <div className='grid gap-1 pl-6'>
            <p className='text-display-ui-6 text-strong'>{event.eventName}</p>
            <div className='flex items-center gap-1 text-ui-meta text-subtle'>
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
            className='hidden size-16 shrink-0 rounded-lg bg-subtle object-cover @sm:block @md:size-20'
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
            <Popover.Content
              intent='danger'
              data-cart-confirm
              positionerProps={{ align: 'end', sideOffset: 4 }}
            >
              <Popover.Arrow />
              <Popover.Header>
                <Popover.Title>
                  Remove all tickets for this event?
                </Popover.Title>
                <Popover.Description>
                  This action cannot be undone.
                </Popover.Description>
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
        {event.tickets.map((ticket) => {
          const seatLabel = formatSeatRange(ticket.seats)
          return (
            <div
              key={`${ticket.name}|${ticket.priceEach}|${seatLabel ?? ''}`}
              className='grid gap-1'
            >
              <div className='flex items-center justify-between gap-2'>
                <p className='min-w-0 truncate text-ui-meta font-medium text-strong'>
                  {ticket.name}
                </p>
                {seatLabel && (
                  <Badge emphasis='subtle' size='sm' className='shrink-0'>
                    <SeatIcon weight='bold' />
                    {seatLabel}
                  </Badge>
                )}
              </div>
              <div className='flex items-center rounded-lg emphasis-subtle px-2 py-1.5'>
                <span className='w-20 shrink-0 text-ui-meta font-medium text-subtle'>
                  {ticket.priceEach === 0
                    ? 'Free'
                    : formatCurrency(ticket.priceEach, { locale, currency })}
                </span>
                <div className='flex flex-1 items-center justify-center'>
                  <Badge emphasis='normal' size='sm'>
                    <TicketIcon weight='bold' />
                    {ticket.quantity}
                  </Badge>
                </div>
                <span className='w-24 shrink-0 text-right text-ui-meta font-medium text-strong tabular-nums'>
                  {formatCurrency(ticket.quantity * ticket.priceEach, {
                    locale,
                    currency
                  })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
