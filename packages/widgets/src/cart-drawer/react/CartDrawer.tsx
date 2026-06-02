'use client'

import {
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import { LazyMotion, domAnimation, m, useTransform } from 'motion/react'
import FocusLock from 'react-focus-lock'

import { cn } from '@oztix/roadie-core/utils'

import {
  BOUNCE_HOLD_MS,
  type CartClient,
  buildBrowseHref,
  createExpiryWatcher,
  isSafeRelativePath
} from '../core'
import { CartContents } from './CartContents'
import { CartDrawerFooter, CartDrawerHeader } from './CartDrawerHandle'
import {
  lockBodyScroll as acquireBodyScrollLock,
  clearDrawerHeightVar,
  setDrawerHeightVar
} from './documentEffects'
import { useCartDetails, useCartSummary } from './useCart'
import { useCartBounce } from './useCartBounce'
import { useCartDrawerDrag } from './useCartDrawerDrag'

export type CartDrawerProps = {
  /** Core cart client (host + fetch injected by the consuming app). */
  cart: CartClient
  collectionId: string
  /** REQUIRED — routing is the consumer's job. No silent no-op fallback. */
  onNavigate: (href: string) => void
  /**
   * Empty-state "Browse" target. Optional — when omitted, `CartDrawer` builds
   * a safe default from `collectionId` via `buildBrowseHref` (see
   * `core/url.ts`). Pass this only if you need to override the default
   * collection-cart route. Unsafe values (failing `isSafeRelativePath`) fall
   * back to the built default so the navigation sink stays safe.
   */
  browseHref?: string
  /** Locale for currency/date formatting (design finding #1). */
  locale: string
  /** ISO 4217 currency code (design finding #1). */
  currency: string
  /** Bump to force a refetch of summary + details (design finding #6). */
  refreshKey?: number
  /** Lock body scroll while open. Default true. */
  lockBodyScroll?: boolean
  /** Uncontrolled initial state. Default 'closed'. */
  initialState?: 'closed' | 'open'
  /** Fires on open/close transitions (design finding #9). */
  onOpenChange?: (open: boolean) => void
  /** Fires when the urgency countdown hits expiry (design finding #10). */
  onExpire?: () => void
  /** Reports the docked (closed) drawer height in px — a non-CSS-var alternative
   * to the `--cart-drawer-height` documentElement side effect (design #5). */
  onHeightChange?: (px: number) => void
}

export function CartDrawer({
  cart,
  collectionId,
  onNavigate,
  browseHref,
  locale,
  currency,
  refreshKey,
  lockBodyScroll = true,
  initialState = 'closed',
  onOpenChange,
  onExpire,
  onHeightChange
}: CartDrawerProps): ReactElement | null {
  // Empty-state browse target. Prefer a consumer-supplied browseHref only if
  // it's a safe same-origin relative path; otherwise build the default from
  // collectionId so a tainted host value can never reach onNavigate.
  const effectiveBrowseHref = useMemo(
    () =>
      typeof browseHref === 'string' && isSafeRelativePath(browseHref)
        ? browseHref
        : buildBrowseHref(collectionId),
    [browseHref, collectionId]
  )

  const { data: summary } = useCartSummary(cart, collectionId, refreshKey)
  const {
    data: details,
    isLoading: detailsLoading,
    error: detailsError
  } = useCartDetails(cart, collectionId, refreshKey)

  const grabberRef = useRef<HTMLButtonElement | null>(null)
  const cartHeadingId = useId()

  const {
    state,
    toggle,
    dragHeight,
    dragProgress,
    headerHeight,
    footerHeight,
    setHeaderElement,
    setFooterElement,
    handleDragStart,
    isDragging
  } = useCartDrawerDrag({ initialState })

  // Report open/close transitions to the host (design finding #9).
  const prevStateRef = useRef(state)
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state
      onOpenChange?.(state === 'open')
    }
  }, [state, onOpenChange])

  // Bounce signal: true for 600ms after ticket count increases.
  const [bounce, setBounce] = useState(false)
  const bounceTimeoutRef = useRef<number | null>(null)
  const fireBounce = useCallback(() => {
    setBounce(true)
    if (bounceTimeoutRef.current !== null) {
      window.clearTimeout(bounceTimeoutRef.current)
    }
    bounceTimeoutRef.current = window.setTimeout(
      () => setBounce(false),
      BOUNCE_HOLD_MS
    )
  }, [])
  useEffect(() => {
    return () => {
      if (bounceTimeoutRef.current !== null) {
        window.clearTimeout(bounceTimeoutRef.current)
      }
    }
  }, [])
  useCartBounce(summary?.ticketCount, fireBounce)

  // Fire onExpire once when the countdown reaches the expired state. The
  // CartUrgencyBadge runs its own tick for display; here we watch independently
  // so the host can refetch/clear (the outlet app has no refetch-on-focus).
  // The once-latch + polling live in the shared core watcher; recreating it on
  // expiry change resets the latch.
  const expiresAtUtc = summary?.expiresAtUtc
  useEffect(() => {
    if (!expiresAtUtc || !onExpire) return
    const watcher = createExpiryWatcher(expiresAtUtc, onExpire)
    return () => watcher.stop()
  }, [expiresAtUtc, onExpire])

  // Publish full closed-state drawer height (docked header + footer action row)
  // to a CSS variable so the collection layout reserves matching bottom padding,
  // AND report it via onHeightChange for non-CSS-var hosts (design #5). The var
  // is owned by a per-instance registry (publishes the max live height) so a
  // second drawer's unmount can't wipe this one's reservation.
  const closedHeight = headerHeight + footerHeight
  const heightKeyRef = useRef<object>({})
  useEffect(() => {
    onHeightChange?.(closedHeight)
    const key = heightKeyRef.current
    setDrawerHeightVar(key, closedHeight)
    return () => clearDrawerHeightVar(key)
  }, [closedHeight, onHeightChange])

  // Body scroll lock while open — refcounted so multiple instances don't
  // unlock each other (e.g. a closing variant releasing while another is modal).
  useEffect(() => {
    if (!lockBodyScroll || state !== 'open') return
    return acquireBodyScrollLock()
  }, [lockBodyScroll, state])

  // Escape closes.
  useEffect(() => {
    if (state !== 'open') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state, toggle])

  const overlayOpacity = useTransform(dragProgress, [0, 1], [0, 1])
  const contentOpacity = useTransform(dragProgress, [0.3, 1], [0, 1])

  const checkoutUrl = details ? cart.checkoutUrl(details) : null
  const handleCheckout = useCallback(() => {
    if (checkoutUrl) onNavigate(checkoutUrl)
  }, [checkoutUrl, onNavigate])

  if (!collectionId) return null
  if (!summary) return null

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Dark-blur overlay — fades in with drag progress. Pointer-events gated
         so the closed drawer doesn't block the page. */}
      <m.div
        aria-hidden='true'
        onClick={toggle}
        className={cn(
          'fixed inset-0 z-70 emphasis-overlay transition-opacity duration-300 ease-out',
          state === 'open' ? 'pointer-events-auto' : 'pointer-events-none',
          isDragging && 'transition-none'
        )}
        style={{ opacity: overlayOpacity }}
      />

      {/* Drawer — floating card, centered via mx-auto + max-w, height driven by
         the motion value. */}
      <m.div
        id='cart-drawer'
        {...(state === 'open'
          ? {
              role: 'dialog',
              'aria-modal': true,
              'aria-labelledby': cartHeadingId
            }
          : {
              role: 'region',
              'aria-label': 'Cart summary'
            })}
        className='fixed inset-x-0 bottom-0 z-70 flex flex-col overflow-hidden rounded-t-4xl emphasis-floating sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-[600px] sm:rounded-4xl'
        style={{ height: dragHeight }}
      >
        <FocusLock
          returnFocus
          disabled={state !== 'open'}
          className='flex h-full min-h-0 flex-col'
        >
          <CartDrawerHeader
            ticketCount={summary.ticketCount}
            cartTotal={summary.cartTotal}
            expiresAtUtc={summary.expiresAtUtc}
            locale={locale}
            currency={currency}
            isOpen={state === 'open'}
            bounce={bounce}
            progress={dragProgress}
            onToggle={toggle}
            onPointerDown={handleDragStart}
            headerRef={setHeaderElement}
            grabberRef={grabberRef}
            titleId={cartHeadingId}
          />

          {/* Scrollable body — fills space between header and footer. */}
          <m.div
            id='cart-drawer-body'
            className='min-h-0 flex-1 overflow-y-auto px-4'
            style={{
              opacity: contentOpacity,
              pointerEvents: state === 'open' ? 'auto' : 'none'
            }}
          >
            {detailsError ? (
              <p className='text-prose text-subtle intent-danger' role='status'>
                Couldn&apos;t load your cart. Please try again.
              </p>
            ) : details ? (
              <CartContents
                cart={details}
                onNavigate={onNavigate}
                browseHref={effectiveBrowseHref}
                checkoutUrl={checkoutUrl}
                locale={locale}
                currency={currency}
                hideFooter
              />
            ) : detailsLoading ? (
              <div className='grid gap-4' data-testid='cart-drawer-loading'>
                <div className='h-4 w-40 animate-pulse rounded bg-subtle' />
                <div className='h-32 w-full animate-pulse rounded-xl bg-subtle' />
                <div className='h-32 w-full animate-pulse rounded-xl bg-subtle' />
              </div>
            ) : null}
          </m.div>

          <CartDrawerFooter
            cartTotal={summary.cartTotal}
            locale={locale}
            currency={currency}
            isOpen={state === 'open'}
            progress={dragProgress}
            onToggle={toggle}
            onCheckout={handleCheckout}
            checkoutDisabled={!checkoutUrl}
            onPointerDown={handleDragStart}
            footerRef={setFooterElement}
          />
        </FocusLock>
      </m.div>
    </LazyMotion>
  )
}
