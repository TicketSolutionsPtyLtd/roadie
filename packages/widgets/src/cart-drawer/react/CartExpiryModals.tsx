'use client'

import { useId } from 'react'

import NumberFlow from '@number-flow/react'
import { ClockIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components'

import { CartExpiryModal } from './CartExpiryModal'

type CartExpiryModalsProps = {
  showWarning: boolean
  expired: boolean
  /** Seconds remaining — drives the warning's live countdown. */
  remaining: number | null
  onDismissWarning: () => void
  /** Checkout target for the warning's primary action; null while loading. */
  checkoutUrl: string | null
  /** Collection page — the expired modal's only exit. */
  browseHref: string
  onNavigate: (href: string) => void
}

// The two cart-expiry modals (warning + expired) rendered through the shared
// shell. Both skins' drawers render this; the drawer owns the countdown via
// useCartExpiry and passes the derived flags down. Navigation goes through the
// consumer's onNavigate (no anchors), matching the rest of the widget.
export function CartExpiryModals({
  showWarning,
  expired,
  remaining,
  onDismissWarning,
  checkoutUrl,
  browseHref,
  onNavigate
}: CartExpiryModalsProps) {
  const warningTitleId = useId()
  const expiredTitleId = useId()
  const mins = Math.floor((remaining ?? 0) / 60)
  const secs = (remaining ?? 0) % 60

  return (
    <>
      {/* Close-to-expiry warning — light-dismiss nudge. */}
      <CartExpiryModal
        open={showWarning && !expired}
        dismissible
        onClose={onDismissWarning}
        titleId={warningTitleId}
        title='Still here?'
        icon={
          <div className='flex size-14 items-center justify-center rounded-full bg-subtle'>
            <ClockIcon
              weight='bold'
              className='size-7 text-normal intent-danger'
            />
          </div>
        }
        actions={
          <>
            <Button
              emphasis='normal'
              intent='neutral'
              className='flex-1'
              onClick={onDismissWarning}
            >
              Keep browsing
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
              Checkout
            </Button>
          </>
        }
      >
        Your tickets are held for a little longer. Check out now to secure them.
        <span className='mt-2 block text-display-ui-4 text-normal tabular-nums intent-danger'>
          <NumberFlow value={mins} />:
          <NumberFlow value={secs} format={{ minimumIntegerDigits: 2 }} />
        </span>
      </CartExpiryModal>

      {/* Expired — blocking; the only exit is back to browsing. */}
      <CartExpiryModal
        open={expired}
        titleId={expiredTitleId}
        title='Your hold has ended'
        icon={
          <div className='flex size-16 items-center justify-center rounded-full bg-subtle'>
            <ClockIcon weight='bold' className='size-8 text-subtler' />
          </div>
        }
        actions={
          <Button
            emphasis='strong'
            intent='accent'
            className='flex-1'
            onClick={() => onNavigate(browseHref)}
          >
            Browse events
          </Button>
        }
      >
        Your tickets are no longer being held. Head back to browse and grab them
        again.
      </CartExpiryModal>
    </>
  )
}
