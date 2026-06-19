'use client'

import { CalendarBlankIcon } from '@phosphor-icons/react'
import { AnimatePresence, m } from 'motion/react'

import { Button, Separator } from '@oztix/roadie-components'
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
  /** App-specific browse target for the empty state. */
  browseHref: string
  /** Pre-validated checkout URL. Null when the safety check failed — CTA disabled. */
  checkoutUrl: string | null
  locale: string
  currency: string
  className?: string
  /** Pin the footer to the bottom of the nearest scrolling ancestor. */
  stickyFooter?: boolean
  /** Skip the Total / fees / Checkout footer. */
  hideFooter?: boolean
  /** Optional per-event remove handler. Receives the `eventId`. */
  onRemoveEvent?: (eventId: string) => void
  /** True while a remove is in flight — disables the trash triggers. */
  busy?: boolean
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
  onRemoveEvent,
  busy = false
}: CartContentsProps) {
  const ticketCount = cart.events.reduce(
    (sum, event) =>
      sum + event.tickets.reduce((tSum, t) => tSum + t.quantity, 0),
    0
  )
  if (ticketCount === 0) {
    return <CartEmptyState browseHref={browseHref} onNavigate={onNavigate} />
  }

  const dayGroups = groupEventsByDay(cart.events)
  const totalBookingFees = cart.events.reduce(
    (sum, event) => sum + event.bookingFees,
    0
  )

  return (
    <div className={className ?? 'grid gap-5'}>
      {/* initial={false} → only removals animate, no unfurl on open. exit's
         overflow is applied only on exit so the sticky header isn't trapped
         in a scroll container while scrolling. */}
      <AnimatePresence initial={false}>
        {dayGroups.map((group) => (
          <m.section
            key={group.key}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            // Full-bleed lives on the section (not the header via -mx-4) so the
            // exit's overflow:hidden clips vertically without shearing off the
            // header's left/right bleed.
            className='-mx-4 grid gap-4'
          >
            <div className='sticky top-0 z-sticky emphasis-strong px-4 py-2.5'>
              <div className='flex items-center gap-2'>
                <CalendarBlankIcon weight='bold' className='size-4 shrink-0' />
                <p className='text-ui-meta font-bold'>
                  {formatDayHeader(group.key, { locale })}
                </p>
              </div>
            </div>

            <div className='grid gap-4 px-4'>
              <AnimatePresence initial={false}>
                {group.events.map((event, index) => (
                  <m.div
                    key={event.eventId}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className='grid gap-4'
                  >
                    {index > 0 && (
                      <div className='pl-6'>
                        <Separator />
                      </div>
                    )}
                    <CartEventGroup
                      event={event}
                      locale={locale}
                      currency={currency}
                      onRemoveEvent={onRemoveEvent}
                      isRemoving={busy}
                    />
                  </m.div>
                ))}
              </AnimatePresence>
            </div>
          </m.section>
        ))}
      </AnimatePresence>

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
            Delivery and refund protection calculated at checkout.
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
