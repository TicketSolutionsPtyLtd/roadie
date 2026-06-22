'use client'

import { BagIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'motion/react'

import { Separator } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import { type CartDetails, formatDayHeader, groupEventsByDay } from '../../cart'
import { CartEmptyState } from './CartEmptyState'
import { CartEventGroup } from './CartEventGroup'
import { CartFooter } from './CartFooter'
import { CartUrgencyBadge } from './CartUrgencyBadge'

/**
 * Layout preset:
 * - `drawer` (default): body only — no header/footer, natural height — for the
 *   cart drawer, which renders its own chrome.
 * - `page`: fill-height column with a "Cart" header (ticket count + live expiry),
 *   a sticky edge-to-edge footer, and a centred empty state — for a standalone
 *   `/cart` page.
 */
export type CartContainer = 'drawer' | 'page'

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
  /** Layout preset. `drawer` (default) is body-only; `page` adds the header, sticky footer and fill-height. */
  container?: CartContainer
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
  container = 'drawer',
  onRemoveEvent,
  busy = false
}: CartContentsProps) {
  const isPage = container === 'page'
  const ticketCount = cart.events.reduce(
    (sum, event) =>
      sum + event.tickets.reduce((tSum, t) => tSum + t.quantity, 0),
    0
  )
  const isEmpty = ticketCount === 0

  const dayGroups = groupEventsByDay(cart.events)
  const totalBookingFees = cart.events.reduce(
    (sum, event) => sum + event.bookingFees,
    0
  )

  return (
    // LazyMotion so removals animate standalone; isolate keeps the sticky
    // headers' z-index from escaping the cart.
    <LazyMotion features={domAnimation}>
      <div
        className={cn(
          '@container isolate',
          className ?? (isPage ? 'flex min-h-full flex-col' : 'grid')
        )}
      >
        {isPage && (
          <div className='@xl:mx-auto @xl:w-full @xl:max-w-lg'>
            <div className='grid justify-items-center gap-2 pt-4 pb-3'>
              <h2 className='flex items-center gap-2 text-display-ui-3 text-strong'>
                <BagIcon
                  weight='bold'
                  className='size-6 text-subtle intent-accent'
                />
                Cart
              </h2>
              <CartUrgencyBadge
                ticketCount={ticketCount}
                expiresAtUtc={cart.expiresAtUtc}
              />
            </div>
          </div>
        )}
        {/* One presence tree across both states so the last removal crossfades
           list → empty. */}
        <AnimatePresence mode='wait' initial={false}>
          {isEmpty ? (
            <m.div
              key='empty'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(isPage && 'grid flex-1 place-content-center')}
            >
              <CartEmptyState browseHref={browseHref} onNavigate={onNavigate} />
            </m.div>
          ) : (
            <m.div
              key='list'
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='grid gap-5 pb-5 @xl:mx-auto @xl:w-full @xl:max-w-lg'
            >
              <AnimatePresence initial={false}>
                {dayGroups.map((group) => (
                  <m.section
                    key={group.key}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    // Full-bleed on the section so the exit clip doesn't shear
                    // the header's -mx-4 bleed; dropped at @xl where it rounds.
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
            </m.div>
          )}
        </AnimatePresence>

        {isPage && !isEmpty && (
          // Edge-to-edge separator (-mx-4); mt-auto + sticky pin it to the
          // bottom. z-sticky so a day header can't scroll over it.
          <div className='sticky bottom-0 z-sticky -mx-4 mt-auto border-t border-subtle bg-raised'>
            <div className='@xl:mx-auto @xl:w-full @xl:max-w-lg'>
              <CartFooter
                cartTotal={cart.cartTotal}
                bookingFees={totalBookingFees}
                locale={locale}
                currency={currency}
                onSecondary={() => onNavigate(browseHref)}
                onCheckout={() => {
                  if (checkoutUrl) onNavigate(checkoutUrl)
                }}
                checkoutDisabled={!checkoutUrl}
              />
            </div>
          </div>
        )}
      </div>
    </LazyMotion>
  )
}
