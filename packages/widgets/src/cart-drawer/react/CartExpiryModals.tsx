'use client'

import NumberFlow from '@number-flow/react'
import { ClockIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components'

import { CartExpiryModal } from './CartExpiryModal'

export type CartExpiryModalsProps = {
  showWarning: boolean
  expired: boolean
  remaining: number | null
  onDismissWarning: () => void
  checkoutUrl: string | null
  browseHref: string
  onNavigate: (href: string) => void
}

export function CartExpiryModals({
  showWarning,
  expired,
  remaining,
  onDismissWarning,
  checkoutUrl,
  browseHref,
  onNavigate
}: CartExpiryModalsProps) {
  const mins = Math.floor((remaining ?? 0) / 60)
  const secs = (remaining ?? 0) % 60

  return (
    <>
      <CartExpiryModal
        open={showWarning && !expired}
        dismissible
        onClose={onDismissWarning}
        title='Still here?'
        icon={
          <div className='flex size-14 items-center justify-center rounded-full bg-subtle'>
            <ClockIcon
              weight='bold'
              className='size-7 text-[var(--intent-9)] intent-danger'
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
              intent='danger'
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
        <span className='mt-2 block text-display-ui-4 text-[var(--intent-9)] tabular-nums intent-danger'>
          <NumberFlow value={mins} />:
          <NumberFlow value={secs} format={{ minimumIntegerDigits: 2 }} />
        </span>
      </CartExpiryModal>

      <CartExpiryModal
        open={expired}
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
