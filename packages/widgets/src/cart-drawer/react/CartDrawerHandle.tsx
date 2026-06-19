'use client'

import { type PointerEvent as ReactPointerEvent, type Ref } from 'react'

import NumberFlow from '@number-flow/react'
import { BagIcon, XIcon } from '@phosphor-icons/react'
import { type MotionValue, m, useTransform } from 'motion/react'

import { Button, IconButton } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import { currencyPrefix, formatCurrency } from '../../cart'
import { CartUrgencyBadge } from './CartUrgencyBadge'

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
        // Whole header reads as clickable (pointer); only the pill below shows
        // the grab cursor. Dragging the whole header still works.
        'relative shrink-0 cursor-pointer touch-none select-none',
        bounce && 'animate-nudge'
      )}
    >
      {/* The drag pill is the focusable/clickable toggle. It stays in flow so
         it reserves its own row above the title (not overlapping the badge),
         and is pill-shaped so the is-interactive focus ring hugs the handle.
         detail === 0 fires onToggle only for synthetic clicks (screen readers +
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
          // inert when closed so the hidden close button isn't a phantom tab
          // stop between the handle and the footer actions.
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
  /** Summed booking fees across cart events — drives the footer fees line. */
  bookingFees: number
  locale: string
  currency: string
  isOpen: boolean
  progress: MotionValue<number>
  /** Mount context — drives the open-state "Browse events" action. */
  context: 'collection' | 'event'
  onToggle: () => void
  onCheckout: () => void
  /** Open-state "Browse events" in `event` context — parent navigates. */
  onBrowse: () => void
  /** True while the checkout URL isn't known/safe — button stays visible but
   * disabled so the click isn't a silent no-op. */
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
  const prefix = currencyPrefix(locale, currency)

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
      <div className='px-4 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'>
        {/* maxHeight:0 when closed so it takes no layout space and doesn't
           pad the closed-state footer. */}
        <m.div
          className='overflow-hidden'
          style={{ maxHeight: subtotalMaxHeight, opacity: subtotalOpacity }}
        >
          <div className='flex items-center justify-between gap-4 pt-3 pb-1'>
            <span className='text-ui font-bold text-strong'>Subtotal</span>
            <NumberFlow
              value={cartTotal}
              prefix={prefix}
              format={{ minimumFractionDigits: 2 }}
              className='text-ui font-bold text-strong'
            />
          </div>
        </m.div>

        {/* Padding lives on the inner <p> so max-height:0 fully collapses the
           line when closed (no residual gap above the buttons). */}
        <m.div
          className='overflow-hidden'
          style={{ maxHeight: feesMaxHeight, opacity: feesOpacity }}
        >
          <p className='pb-4 text-ui-meta text-subtle'>
            {bookingFees > 0
              ? `Incl. ${formatCurrency(bookingFees, { locale, currency })} booking fees. Delivery and refund protection calculated at checkout.`
              : 'Includes booking fees. Delivery and refund protection calculated at checkout.'}
          </p>
        </m.div>

        {/* stopPropagation prevents drag. */}
        <div className='flex gap-3' onPointerDown={(e) => e.stopPropagation()}>
          <Button
            emphasis='normal'
            intent='neutral'
            className='flex-1'
            onClick={() => {
              // `event` context always navigates; `collection` toggles the drawer.
              if (context === 'event') onBrowse()
              else onToggle()
            }}
          >
            {context === 'event' || isOpen ? 'Browse events' : 'View cart'}
          </Button>
          <Button
            emphasis='strong'
            intent='accent'
            className='flex-1'
            onClick={onCheckout}
            disabled={checkoutDisabled}
          >
            <BagIcon weight='bold' className='mr-1.5 size-4' />
            Checkout
          </Button>
        </div>
      </div>
    </m.div>
  )
}
