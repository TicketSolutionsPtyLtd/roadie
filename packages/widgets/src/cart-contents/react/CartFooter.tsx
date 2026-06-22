'use client'

import NumberFlow from '@number-flow/react'
import { BagIcon } from '@phosphor-icons/react'
import { type MotionStyle, m } from 'motion/react'

import { Button } from '@oztix/roadie-components'

import { currencyPrefix, formatCurrency } from '../../cart'

export type CartFooterProps = {
  cartTotal: number
  bookingFees: number
  locale: string
  currency: string
  onSecondary: () => void
  secondaryLabel?: string
  onCheckout: () => void
  checkoutDisabled?: boolean
  /** Collapse styles for the drawer's open/close. Omit for a static footer. */
  subtotalStyle?: MotionStyle
  feesStyle?: MotionStyle
}

export function CartFooter({
  cartTotal,
  bookingFees,
  locale,
  currency,
  onSecondary,
  secondaryLabel = 'Browse events',
  onCheckout,
  checkoutDisabled = false,
  subtotalStyle,
  feesStyle
}: CartFooterProps) {
  const feesLabel =
    bookingFees > 0
      ? `Incl. ${formatCurrency(bookingFees, { locale, currency })} booking fees. Delivery and refund protection calculated at checkout.`
      : 'Includes booking fees. Delivery and refund protection calculated at checkout.'

  return (
    <div className='px-4 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'>
      <m.div className='overflow-hidden' style={subtotalStyle}>
        <div className='flex items-center justify-between gap-4 pt-3 pb-1'>
          <span className='text-ui font-bold text-strong'>Subtotal</span>
          <NumberFlow
            value={cartTotal}
            prefix={currencyPrefix(locale, currency)}
            format={{ minimumFractionDigits: 2 }}
            className='text-ui font-bold text-strong'
          />
        </div>
      </m.div>

      <m.div className='overflow-hidden' style={feesStyle}>
        <p className='pb-4 text-ui-meta text-subtle'>{feesLabel}</p>
      </m.div>

      {/* Don't let a press on the buttons start the drawer's drag. */}
      <div className='flex gap-3' onPointerDown={(e) => e.stopPropagation()}>
        <Button
          emphasis='normal'
          intent='neutral'
          className='flex-1'
          onClick={onSecondary}
        >
          {secondaryLabel}
        </Button>
        <Button
          emphasis='strong'
          intent='accent'
          className='flex-1'
          disabled={checkoutDisabled}
          onClick={onCheckout}
        >
          <BagIcon weight='bold' className='mr-1.5 size-4' />
          Checkout
        </Button>
      </div>
    </div>
  )
}
