'use client'

import { type PointerEvent as ReactPointerEvent, type Ref } from 'react'

import NumberFlow from '@number-flow/react'
import { type MotionValue, m, useTransform } from 'motion/react'

import { Button, IconButton } from '@oztix/roadie-components'
import { cn } from '@oztix/roadie-core/utils'

import { currencyPrefix } from '../core'
import { CartUrgencyBadge } from './CartUrgencyBadge'
import { BagIcon, XIcon } from './icons'

/* ============================================================================
 * Header — drag pill + morphing title area (Cart title left→center, urgency
 * badge sliding top:4→36, total right fading out, close button left fading in)
 * ========================================================================== */

interface CartDrawerHeaderProps {
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
  const titleAreaHeight = useTransform(progress, [0, 1], [32, 72])
  const titleLeft = useTransform(progress, (p) =>
    p <= 0 ? '16px' : `calc(${16 * (1 - p)}px + ${p * 50}%)`
  )
  const titleTransform = useTransform(
    progress,
    (p) => `translateX(${-50 * p}%)`
  )
  const badgeTop = useTransform(progress, [0, 1], [4, 36])
  const priceOpacity = useTransform(progress, [0, 1], [1, 0])
  const closeOpacity = useTransform(progress, [0.5, 0.7], [0, 1])
  const closeScale = useTransform(progress, [0.5, 0.7], [0.8, 1])
  const prefix = currencyPrefix(locale, currency)

  return (
    <div
      ref={headerRef}
      onPointerDown={onPointerDown}
      className={cn(
        'relative shrink-0 cursor-grab touch-none select-none active:cursor-grabbing',
        bounce && 'animate-cart-bounce'
      )}
    >
      {/* Drag pill — decorative. */}
      <div className='flex justify-center pt-2 pb-2'>
        <div aria-hidden='true' className='h-1.5 w-9 rounded-full bg-subtle' />
      </div>
      {/* Keyboard / screen-reader entry point — visually invisible overlay on
         the drag pill. onClick fires onToggle only for synthetic clicks
         (detail === 0), which is how screen readers + Enter/Space activate. */}
      <button
        ref={grabberRef}
        type='button'
        aria-expanded={isOpen}
        aria-controls='cart-drawer-body'
        aria-label={isOpen ? 'Close cart' : 'Open cart'}
        className='absolute top-0 left-1/2 size-11 -translate-x-1/2 cursor-grab appearance-none rounded-full bg-transparent text-transparent outline-offset-2 focus:outline-none focus-visible:text-strong focus-visible:outline-2 focus-visible:outline-current'
        onClick={(e) => {
          if (e.detail === 0) onToggle()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      />

      {/* Title area — morphing. */}
      <m.div className='relative' style={{ height: titleAreaHeight }}>
        {/* Close button — left, fades in late. */}
        <m.div
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
            size='icon-sm'
            onClick={onToggle}
          >
            <XIcon className='size-4' />
          </IconButton>
        </m.div>

        {/* Cart title — morphs left → center. */}
        <m.div
          id={titleId}
          className='absolute top-0 flex h-8 items-center gap-2'
          style={{ left: titleLeft, transform: titleTransform }}
        >
          <BagIcon className='size-5 text-subtle intent-accent' />
          <span className='text-ui font-bold text-strong'>Cart</span>
        </m.div>

        {/* Urgency badge — slides from inline to below title on open. */}
        <m.div
          className='absolute left-1/2 -translate-x-1/2'
          style={{ top: badgeTop }}
        >
          <CartUrgencyBadge
            ticketCount={ticketCount}
            expiresAtUtc={expiresAtUtc}
            progress={isOpen ? 1 : 0}
            bounce={bounce}
          />
        </m.div>

        {/* Price — right, fades out on open. Digits roll on change. */}
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

/* ============================================================================
 * Footer — Subtotal (fades in on open), fees line (fades in late), action
 * buttons (always visible)
 * ========================================================================== */

interface CartDrawerFooterProps {
  cartTotal: number
  locale: string
  currency: string
  isOpen: boolean
  progress: MotionValue<number>
  onToggle: () => void
  onCheckout: () => void
  /** True while the checkout URL isn't known/safe — button stays visible but
   * disabled so the click isn't a silent no-op. */
  checkoutDisabled?: boolean
  onPointerDown: (e: ReactPointerEvent) => void
  footerRef: (el: HTMLElement | null) => void
}

export function CartDrawerFooter({
  cartTotal,
  locale,
  currency,
  isOpen,
  progress,
  onToggle,
  onCheckout,
  checkoutDisabled = false,
  onPointerDown,
  footerRef
}: CartDrawerFooterProps) {
  const subtotalMaxHeight = useTransform(progress, [0, 1], [0, 50])
  const subtotalOpacity = useTransform(progress, [0, 1], [0, 1])
  const feesMaxHeight = useTransform(progress, [0, 1], [0, 40])
  const feesOpacity = useTransform(progress, [0.5, 1], [0, 1])
  const footerShadow = useTransform(
    progress,
    (p) => `0 -4px 16px oklch(0 0 0 / ${p * 0.08})`
  )
  const prefix = currencyPrefix(locale, currency)

  return (
    <m.div
      ref={footerRef}
      onPointerDown={isOpen ? undefined : onPointerDown}
      className={cn(
        'shrink-0 bg-raised',
        !isOpen && 'cursor-grab touch-none select-none active:cursor-grabbing'
      )}
      style={{ boxShadow: footerShadow }}
    >
      <div className='px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'>
        {/* Subtotal — fades/grows when open. maxHeight:0 when closed so it takes
           no layout space and doesn't pad the closed-state footer. */}
        <m.div
          className='overflow-hidden'
          style={{ maxHeight: subtotalMaxHeight, opacity: subtotalOpacity }}
        >
          <div className='flex items-center justify-between gap-4 pb-2'>
            <span className='text-ui font-bold text-strong'>Subtotal</span>
            <NumberFlow
              value={cartTotal}
              prefix={prefix}
              format={{ minimumFractionDigits: 2 }}
              className='text-ui font-bold text-strong'
            />
          </div>
        </m.div>

        {/* Fees line — fades in later. */}
        <m.p
          className='overflow-hidden pb-2 text-ui-meta text-subtle'
          style={{ maxHeight: feesMaxHeight, opacity: feesOpacity }}
        >
          Delivery and refund protection calculated at checkout
        </m.p>

        {/* Buttons — always visible. stopPropagation prevents drag. */}
        <div className='flex gap-3' onPointerDown={(e) => e.stopPropagation()}>
          <Button
            emphasis='normal'
            intent='neutral'
            className='flex-1'
            onClick={onToggle}
          >
            {isOpen ? 'Browse events' : 'Open cart'}
          </Button>
          <Button
            emphasis='strong'
            intent='accent'
            className='flex-1'
            onClick={onCheckout}
            disabled={checkoutDisabled}
          >
            <BagIcon className='mr-1.5 size-4' />
            Checkout
          </Button>
        </div>
      </div>
    </m.div>
  )
}
