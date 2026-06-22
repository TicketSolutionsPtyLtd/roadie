'use client'

import { type PointerEvent as ReactPointerEvent, type Ref } from 'react'

import NumberFlow from '@number-flow/react'
import { BagIcon, XIcon } from '@phosphor-icons/react'
import { type MotionValue, m, useTransform } from 'motion/react'

import { IconButton } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import { currencyPrefix } from '../../cart'
import { CartFooter } from '../../cart-contents/react/CartFooter'
import { CartUrgencyBadge } from '../../cart-contents/react/CartUrgencyBadge'

type CartDrawerHeaderProps = {
  ticketCount: number
  cartTotal: number
  expiresAtUtc: string | undefined
  locale: string
  currency: string
  isOpen: boolean
  bounce: boolean
  progress: MotionValue<number>
  onToggle: () => void
  onPointerDown: (e: ReactPointerEvent) => void
  headerRef: (el: HTMLElement | null) => void
  grabberRef: Ref<HTMLButtonElement>
  titleId: string
}

export function CartDrawerHeader({
  ticketCount,
  cartTotal,
  expiresAtUtc,
  locale,
  currency,
  isOpen,
  bounce,
  progress,
  onToggle,
  onPointerDown,
  headerRef,
  grabberRef,
  titleId
}: CartDrawerHeaderProps) {
  const titleAreaHeight = useTransform(progress, [0, 1], [32, 76])
  const titleLeft = useTransform(progress, (p) =>
    p <= 0 ? '16px' : `calc(${16 * (1 - p)}px + ${p * 50}%)`
  )
  const titleTransform = useTransform(
    progress,
    (p) => `translateX(${-50 * p}%)`
  )
  const badgeTop = useTransform(progress, [0, 1], [0, 36])
  const priceOpacity = useTransform(progress, [0, 1], [1, 0])
  const closeOpacity = useTransform(progress, [0.5, 0.7], [0, 1])
  const closeScale = useTransform(progress, [0.5, 0.7], [0.8, 1])
  const prefix = currencyPrefix(locale, currency)

  return (
    <div
      ref={headerRef}
      onPointerDown={onPointerDown}
      className={cn(
        'relative shrink-0 cursor-pointer touch-none select-none',
        bounce && 'animate-nudge'
      )}
    >
      {/* detail === 0 toggles only for synthetic clicks (screen readers,
         Enter/Space); real pointer taps toggle via the header's drag/tap. */}
      <div className='flex justify-center pt-1 pb-1'>
        <button
          ref={grabberRef}
          type='button'
          aria-expanded={isOpen}
          aria-controls='cart-drawer-body'
          aria-label={isOpen ? 'Close cart' : 'Open cart'}
          className='is-interactive flex cursor-grab appearance-none items-center justify-center rounded-full bg-transparent px-3 py-1 active:cursor-grabbing'
          onClick={(e) => {
            if (e.detail === 0) onToggle()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggle()
            }
          }}
        >
          <span
            aria-hidden='true'
            className='h-1.5 w-9 rounded-full bg-subtle'
          />
        </button>
      </div>

      <m.div className='relative' style={{ height: titleAreaHeight }}>
        <m.div
          // inert when closed so the hidden close button isn't a phantom tab stop.
          inert={!isOpen}
          className='absolute top-0 left-4'
          style={{
            opacity: closeOpacity,
            scale: closeScale,
            pointerEvents: isOpen ? 'auto' : 'none'
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconButton
            aria-label='Close cart'
            emphasis='subtle'
            intent='neutral'
            size='sm'
            onClick={onToggle}
          >
            <XIcon weight='bold' className='size-4' />
          </IconButton>
        </m.div>

        <m.div
          id={titleId}
          className='absolute top-0 flex h-8 items-center gap-2'
          style={{ left: titleLeft, transform: titleTransform }}
        >
          <BagIcon weight='bold' className='size-5 text-subtle intent-accent' />
          <span className='text-ui font-bold text-strong'>Cart</span>
        </m.div>

        <m.div
          className='absolute left-1/2 flex h-8 -translate-x-1/2 items-center'
          style={{ top: badgeTop }}
        >
          <CartUrgencyBadge
            ticketCount={ticketCount}
            expiresAtUtc={expiresAtUtc}
            progress={isOpen ? 1 : 0}
            bounce={bounce}
            className='is-interactive'
          />
        </m.div>

        <m.div
          className='absolute top-0 right-4 flex h-8 items-center'
          style={{ opacity: priceOpacity }}
        >
          <NumberFlow
            value={cartTotal}
            prefix={prefix}
            format={{ minimumFractionDigits: 2 }}
            className='text-ui font-bold text-strong'
          />
        </m.div>
      </m.div>
    </div>
  )
}

type CartDrawerFooterProps = {
  cartTotal: number
  bookingFees: number
  locale: string
  currency: string
  isOpen: boolean
  progress: MotionValue<number>
  context: 'collection' | 'event'
  onToggle: () => void
  onCheckout: () => void
  onBrowse: () => void
  checkoutDisabled?: boolean
  onPointerDown: (e: ReactPointerEvent) => void
  footerRef: (el: HTMLElement | null) => void
}

export function CartDrawerFooter({
  cartTotal,
  bookingFees,
  locale,
  currency,
  isOpen,
  progress,
  context,
  onToggle,
  onCheckout,
  onBrowse,
  checkoutDisabled = false,
  onPointerDown,
  footerRef
}: CartDrawerFooterProps) {
  const subtotalMaxHeight = useTransform(progress, [0, 1], [0, 50])
  const subtotalOpacity = useTransform(progress, [0, 1], [0, 1])
  const feesMaxHeight = useTransform(progress, [0, 1], [0, 64])
  const feesOpacity = useTransform(progress, [0.5, 1], [0, 1])
  const footerShadow = useTransform(
    progress,
    (p) => `0 -4px 16px oklch(0.1 0.04 var(--intent-hue) / ${p * 0.08})`
  )

  return (
    <m.div
      ref={footerRef}
      onPointerDown={isOpen ? undefined : onPointerDown}
      className={cn(
        'shrink-0 bg-raised',
        !isOpen && 'cursor-pointer touch-none select-none'
      )}
      style={{ boxShadow: footerShadow }}
    >
      <CartFooter
        cartTotal={cartTotal}
        bookingFees={bookingFees}
        locale={locale}
        currency={currency}
        secondaryLabel={
          context === 'event' || isOpen ? 'Browse events' : 'View cart'
        }
        // `event` context always navigates; `collection` toggles the drawer.
        onSecondary={() => (context === 'event' ? onBrowse() : onToggle())}
        onCheckout={onCheckout}
        checkoutDisabled={checkoutDisabled}
        subtotalStyle={{
          maxHeight: subtotalMaxHeight,
          opacity: subtotalOpacity
        }}
        feesStyle={{ maxHeight: feesMaxHeight, opacity: feesOpacity }}
      />
    </m.div>
  )
}
