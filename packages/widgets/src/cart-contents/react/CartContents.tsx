'use client'

import NumberFlow from '@number-flow/react'
import { BagIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'motion/react'

import { Button, Separator } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import {
  type CartDetails,
  currencyPrefix,
  formatCurrency,
  formatDayHeader,
  groupEventsByDay
} from '../../cart'
import { CartEmptyState } from './CartEmptyState'
import { CartEventGroup } from './CartEventGroup'

export type CartContentsProps = {
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
    // Self-provide motion features so removals animate even when rendered
    // standalone (no drawer LazyMotion ancestor). Nesting inside the drawer's
    // LazyMotion is fine.
    <LazyMotion features={domAnimation}>
      {/* @container so the event-image container queries (@sm/@md in
         CartEventGroup) resolve standalone, exactly as they do inside the
         drawer body's @container. `isolate` keeps the sticky day headers'
         z-index contained to the cart — without it they paint over app
         content (the drawer gets this for free from its fixed z-modal panel). */}
      <div className={cn('@container isolate', className ?? 'grid gap-5')}>
        {/* Once the container is wide (@xl ≈ 576px) the list stops going
         edge-to-edge: it centres at a readable max width and the day headers
         pick up rounded corners (see @xl utilities below). */}
        <div className='grid gap-5 @xl:mx-auto @xl:w-full @xl:max-w-lg'>
          {/* initial={false} → only removals animate, no unfurl on open. exit's
           overflow is applied only on exit so the sticky header isn't trapped
           in a scroll container while scrolling. */}
          <AnimatePresence initial={false}>
            {dayGroups.map((group) => (
              <m.section
                key={group.key}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                // Full-bleed lives on the section (not the header via -mx-4) so
                // the exit's overflow:hidden clips vertically without shearing
                // off the header's left/right bleed. At @xl the column is
                // constrained, so the bleed is dropped and the header rounds.
                className='-mx-4 grid gap-4 @xl:mx-0'
              >
                <div className='sticky top-0 z-sticky emphasis-strong px-4 py-2.5 @xl:rounded-xl'>
                  <div className='flex items-center gap-2'>
                    <CalendarBlankIcon
                      weight='bold'
                      className='size-4 shrink-0'
                    />
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
        </div>

        {!hideFooter && (
          // The footer band stays full-bleed; only its content tracks the same
          // @xl max-width column as the list above so they stay aligned.
          <div
            className={cn(
              'border-t border-subtle pt-4',
              stickyFooter &&
                'sticky bottom-0 bg-raised pb-[env(safe-area-inset-bottom)]'
            )}
          >
            <div className='@xl:mx-auto @xl:w-full @xl:max-w-lg'>
              <div className='flex items-center justify-between gap-4 pb-1'>
                <span className='text-ui font-bold text-strong'>Subtotal</span>
                <NumberFlow
                  value={cart.cartTotal}
                  prefix={currencyPrefix(locale, currency)}
                  format={{ minimumFractionDigits: 2 }}
                  className='text-ui font-bold text-strong'
                />
              </div>
              <p className='pb-4 text-ui-meta text-subtle'>
                {totalBookingFees > 0
                  ? `Incl. ${formatCurrency(totalBookingFees, {
                      locale,
                      currency
                    })} booking fees. `
                  : 'Includes booking fees. '}
                Delivery and refund protection calculated at checkout.
              </p>
              {/* Mirrors the drawer footer: neutral secondary + strong-accent
             Checkout with the bag icon. */}
              <div className='flex gap-3'>
                <Button
                  emphasis='normal'
                  intent='neutral'
                  className='flex-1'
                  onClick={() => onNavigate(browseHref)}
                >
                  Browse events
                </Button>
                <Button
                  emphasis='strong'
                  intent='accent'
                  className='flex-1'
                  disabled={!checkoutUrl}
                  onClick={() => {
                    if (checkoutUrl) onNavigate(checkoutUrl)
                  }}
                >
                  <BagIcon weight='bold' className='mr-1.5 size-4' />
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LazyMotion>
  )
}
