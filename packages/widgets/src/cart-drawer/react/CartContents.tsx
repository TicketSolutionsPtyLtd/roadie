'use client'

import { CalendarBlankIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import {
  type CartDetails,
  formatCurrency,
  formatDayHeader,
  groupEventsByDay
} from '../core'
import { CartEmptyState } from './CartEmptyState'
import { CartEventGroup } from './CartEventGroup'

type CartContentsProps = {
  cart: CartDetails
  onNavigate: (href: string) => void
  /** App-specific browse target for the empty state (design finding #4). */
  browseHref: string
  /** Pre-validated checkout URL from `cart.checkoutUrl(details)`. Null when the
   * extrasUrl failed the same-origin safety check — the CTA is then disabled. */
  checkoutUrl: string | null
  locale: string
  currency: string
  className?: string
  /** Pin the footer to the bottom of the nearest scrolling ancestor. */
  stickyFooter?: boolean
  /** Skip the Total / fees / Checkout footer (the drawer renders its own). */
  hideFooter?: boolean
  /** Round the day headers (`rounded-lg`) instead of full-bleed (`-mx-4`).
   * Default false — the drawer uses full-bleed; a standalone cart page can
   * opt into rounded headers. */
  roundedDayHeaders?: boolean
}

export function CartContents({
  cart,
  onNavigate,
  browseHref,
  checkoutUrl,
  locale,
  currency,
  className,
  stickyFooter = false,
  hideFooter = false,
  roundedDayHeaders = false
}: CartContentsProps) {
  const ticketCount = cart.events.reduce(
    (sum, event) =>
      sum + event.tickets.reduce((tSum, t) => tSum + t.quantity, 0),
    0
  )
  if (ticketCount === 0) {
    return <CartEmptyState browseHref={browseHref} onNavigate={onNavigate} />
  }

  // Core groups by venue-local eventDateKey and orders by eventStartAtUtc.
  const dayGroups = groupEventsByDay(cart.events)
  const totalBookingFees = cart.events.reduce(
    (sum, event) => sum + event.bookingFees,
    0
  )

  return (
    <div className={className ?? 'grid gap-5'}>
      {dayGroups.map((group) => (
        <section key={group.key} className='grid gap-4'>
          <div
            className={cn(
              'sticky top-0 z-10 emphasis-strong px-4 py-2.5',
              roundedDayHeaders ? 'rounded-lg' : '-mx-4'
            )}
          >
            <div className='flex items-center gap-2'>
              <CalendarBlankIcon
                weight='bold'
                className='size-4 shrink-0 text-subtle'
              />
              <p className='text-ui-meta font-bold'>
                {formatDayHeader(group.key, { locale })}
              </p>
            </div>
          </div>

          <div className='grid gap-4 px-4'>
            {group.events.map((event) => (
              <CartEventGroup
                key={event.eventId}
                event={event}
                locale={locale}
                currency={currency}
              />
            ))}
          </div>
        </section>
      ))}

      {!hideFooter && (
        <div
          className={cn(
            'grid gap-4 border-t border-subtle pt-4',
            stickyFooter &&
              'sticky bottom-0 bg-raised pb-[env(safe-area-inset-bottom)]'
          )}
        >
          <div className='flex items-center justify-between gap-4'>
            <span className='text-ui font-bold text-strong'>Total</span>
            <span className='text-ui font-bold text-strong'>
              {formatCurrency(cart.cartTotal, { locale, currency })}
            </span>
          </div>
          <p className='text-ui-meta text-subtle'>
            {totalBookingFees > 0
              ? `Incl. ${formatCurrency(totalBookingFees, {
                  locale,
                  currency
                })} booking fees. `
              : 'Includes booking fees. '}
            Delivery and refund protection calculated at checkout
          </p>
          <Button
            emphasis='normal'
            intent='brand'
            disabled={!checkoutUrl}
            onClick={() => {
              if (checkoutUrl) onNavigate(checkoutUrl)
            }}
          >
            Checkout
          </Button>
        </div>
      )}
    </div>
  )
}
