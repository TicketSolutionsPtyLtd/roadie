'use client'

import NumberFlow from '@number-flow/react'
import { ClockIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components'

import { CartExpiryDialog } from './CartExpiryDialog'

export type CartExpiryDialogsProps = {
  showWarning: boolean
  expired: boolean
  remaining: number | null
  onDismissWarning: () => void
  checkoutUrl: string | null
  browseHref: string
  onNavigate: (href: string) => void
}

export function CartExpiryDialogs({
  showWarning,
  expired,
  remaining,
  onDismissWarning,
  checkoutUrl,
  browseHref,
  onNavigate
}: CartExpiryDialogsProps) {
  const mins = Math.floor((remaining ?? 0) / 60)
  const secs = (remaining ?? 0) % 60

  return (
    <>
      <CartExpiryDialog
        open={showWarning && !expired}
        intent='warning'
        dismissible
        onClose={onDismissWarning}
        icon={<ClockIcon weight='duotone' />}
        title='Still here?'
        description='Your tickets are held for a little longer. Check out now to secure them.'
        actions={
          <>
            {/* No intent — inherits the dialog's warning via the cascade. */}
            <Button onClick={onDismissWarning}>Keep browsing</Button>
            <Button
              emphasis='strong'
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
        <span className='text-display-ui-4 text-[var(--intent-9)] tabular-nums'>
          <NumberFlow value={mins} />:
          <NumberFlow value={secs} format={{ minimumIntegerDigits: 2 }} />
        </span>
      </CartExpiryDialog>

      <CartExpiryDialog
        open={expired}
        intent='danger'
        icon={<ClockIcon weight='duotone' />}
        title='Your hold has ended'
        description='Your tickets are no longer being held. Head back to browse and grab them again.'
        actions={
          // Accent CTA against the danger framing — the way forward, not a warning.
          <Button
            intent='accent'
            emphasis='strong'
            onClick={() => onNavigate(browseHref)}
          >
            Browse events
          </Button>
        }
      />
    </>
  )
}
