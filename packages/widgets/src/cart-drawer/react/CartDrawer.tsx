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

import { CircleNotchIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useTransform
} from 'motion/react'
import FocusLock from 'react-focus-lock'

import { cn } from '@oztix/roadie-core/utils'

import {
  BOUNCE_HOLD_MS,
  type CartClient,
  EMPTY_CLOSE_UNMOUNT_MS,
  buildBrowseHref,
  createExpiryWatcher,
  deriveBookingFees,
  deriveCartTotal,
  deriveTicketCount,
  isSafeRelativePath
} from '../../cart'
import { CartContents } from '../../cart-contents/react/CartContents'
import { CartEmptyState } from '../../cart-contents/react/CartEmptyState'
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
  /** REQUIRED — routing is the consumer's job. */
  onNavigate: (href: string) => void
  /** Empty-state "Browse" target. Defaults to a safe collectionId-derived path; unsafe values fall back to that default. */
  browseHref?: string
  /** Mount context for the open-state secondary button. Browse target is package-built from collectionId — never a consumer URL — to avoid open-redirect. */
  context?: 'collection' | 'event'
  /** Locale for currency/date formatting. */
  locale: string
  /** ISO 4217 currency code. */
  currency: string
  /** Bump to force a refetch of summary + details. */
  refreshKey?: number
  /** Lock body scroll while open. Default true. */
  lockBodyScroll?: boolean
  /**
   * Controlled open state. When provided, the drawer animates to match it —
   * drive it from your own state so any UI (e.g. a "View cart" button) can
   * open/close it, echoing `onOpenChange` back into it. Omit for uncontrolled
   * (tap/drag) behaviour seeded by `initialState`.
   */
  open?: boolean
  /** Uncontrolled initial state when `open` is omitted. Default 'closed'. */
  initialState?: 'closed' | 'open'
  /** Fires on every open/close intent (tap, drag, Escape, backdrop, or `open`). */
  onOpenChange?: (open: boolean) => void
  /** Fires when the urgency countdown hits expiry. */
  onExpire?: () => void
  /** Reports the docked (closed) drawer height in px. */
  onHeightChange?: (px: number) => void
}

export function CartDrawer({
  cart,
  collectionId,
  onNavigate,
  browseHref,
  context = 'collection',
  locale,
  currency,
  refreshKey,
  lockBodyScroll = true,
  open,
  initialState = 'closed',
  onOpenChange,
  onExpire,
  onHeightChange
}: CartDrawerProps): ReactElement | null {
  // Reject non-safe-relative browseHref to avoid open-redirect.
  const effectiveBrowseHref = useMemo(
    () =>
      typeof browseHref === 'string' && isSafeRelativePath(browseHref)
        ? browseHref
        : buildBrowseHref(collectionId),
    [browseHref, collectionId]
  )

  const queryClient = useQueryClient()

  const { data: summary } = useCartSummary(cart, collectionId, refreshKey)
  const {
    data: details,
    isLoading: detailsLoading,
    error: detailsError
  } = useCartDetails(cart, collectionId, refreshKey)

  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [emptyClosed, setEmptyClosed] = useState(false)

  const displayTicketCount = useMemo(
    () => deriveTicketCount(details ?? null, summary ?? null),
    [details, summary]
  )
  const displayTotal = useMemo(
    () => deriveCartTotal(details ?? null, summary ?? null),
    [details, summary]
  )
  const displayBookingFees = useMemo(
    () => deriveBookingFees(details ?? null),
    [details]
  )

  const sawCartRef = useRef(false)
  // Latch: an emptied cart refetches as null, so remember we saw one and keep
  // the EmptyState mounted instead of letting the drawer vanish.
  const hasCartData = summary != null || details != null
  if (hasCartData && displayTicketCount > 0) sawCartRef.current = true
  const isEmpty =
    (hasCartData && displayTicketCount === 0) ||
    (sawCartRef.current && !hasCartData)

  const grabberRef = useRef<HTMLButtonElement | null>(null)
  const cartHeadingId = useId()

  const {
    state,
    toggle,
    snapTo,
    dragHeight,
    dragProgress,
    headerHeight,
    footerHeight,
    setHeaderElement,
    setFooterElement,
    handleDragStart,
    isDragging
  } = useCartDrawerDrag({
    initialState: open === undefined ? initialState : open ? 'open' : 'closed'
  })

  // Controlled `open`: snap only when the prop itself changes — never off
  // internal `state`, or a tap (which moves state before the parent echoes
  // `open` back) would be reconciled away. Skip mid-drag without consuming the
  // prop so it reconciles once the drag releases.
  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open === undefined || open === prevOpenRef.current) return
    if (isDragging) return
    prevOpenRef.current = open
    if (state !== (open ? 'open' : 'closed')) snapTo(open ? 'open' : 'closed')
  }, [open, state, isDragging, snapTo])

  const prefersReducedMotion = useReducedMotion()

  const prevStateRef = useRef(state)
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state
      onOpenChange?.(state === 'open')
    }
  }, [state, onOpenChange])

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
  useCartBounce(displayTicketCount, fireBounce)

  const expiresAtUtc = summary?.expiresAtUtc ?? details?.expiresAtUtc
  useEffect(() => {
    if (!expiresAtUtc || !onExpire) return
    const watcher = createExpiryWatcher(expiresAtUtc, onExpire)
    return () => watcher.stop()
  }, [expiresAtUtc, onExpire])

  const closedHeight = headerHeight + footerHeight
  const heightKeyRef = useRef<object>({})
  useEffect(() => {
    onHeightChange?.(closedHeight)
    const key = heightKeyRef.current
    setDrawerHeightVar(key, closedHeight)
    return () => clearDrawerHeightVar(key)
  }, [closedHeight, onHeightChange])

  useEffect(() => {
    if (!lockBodyScroll || state !== 'open') return
    return acquireBodyScrollLock()
  }, [lockBodyScroll, state])

  // Defer unmount of an emptied, closed drawer until the slide-down plays.
  useEffect(() => {
    if (isEmpty && state === 'closed') {
      const t = window.setTimeout(
        () => setEmptyClosed(true),
        EMPTY_CLOSE_UNMOUNT_MS
      )
      return () => window.clearTimeout(t)
    }
    setEmptyClosed(false)
  }, [isEmpty, state])

  useEffect(() => {
    if (state !== 'open') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Let an open confirm popover handle Escape first.
      if (document.querySelector('[data-cart-confirm]')) return
      toggle()
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

  const handleBrowse = useCallback(() => {
    onNavigate(effectiveBrowseHref)
  }, [effectiveBrowseHref, onNavigate])

  const removeEvent = useCallback(
    async (eventId: string) => {
      if (!details || removeBusy) return
      setRemoveBusy(true)
      setRemoveError(null)
      try {
        await cart.removeItem(details.cartId, eventId)
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['roadieCartDetails', collectionId]
          }),
          queryClient.invalidateQueries({
            queryKey: ['roadieCartSummary', collectionId]
          })
        ])
      } catch (err) {
        setRemoveError(
          err instanceof Error ? err.message : 'Could not remove this event.'
        )
      } finally {
        setRemoveBusy(false)
      }
    },
    [cart, details, collectionId, queryClient, removeBusy]
  )

  if (!collectionId) return null
  // Unmount only before any cart has shown; after that the latch keeps the
  // EmptyState mounted until the empty-close slide-down finishes.
  if (!summary && !details && !sawCartRef.current) return null
  if (isEmpty && state === 'closed' && emptyClosed) return null

  const emptyClosing = isEmpty && state === 'closed'

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        aria-hidden='true'
        onClick={toggle}
        className={cn(
          'fixed inset-0 z-overlay emphasis-overlay transition-opacity duration-300 ease-out',
          state === 'open' ? 'pointer-events-auto' : 'pointer-events-none',
          isDragging && 'transition-none'
        )}
        style={{ opacity: overlayOpacity }}
      />

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
        initial={
          prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 8 }
        }
        animate={{ opacity: emptyClosing ? 0 : 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={cn(
          'fixed z-modal flex flex-col overflow-hidden emphasis-floating',
          'transition-[border-radius,inset] duration-300 ease-out',
          state === 'open'
            ? 'inset-x-0 bottom-0 rounded-t-4xl'
            : 'inset-x-3 bottom-3 rounded-3xl',
          'sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-xl sm:rounded-4xl',
          isDragging && 'transition-none'
        )}
        style={{ height: dragHeight, transformOrigin: 'bottom' }}
      >
        <FocusLock
          returnFocus
          disabled={state !== 'open'}
          className='flex h-full min-h-0 flex-col'
        >
          <CartDrawerHeader
            ticketCount={displayTicketCount}
            cartTotal={displayTotal}
            expiresAtUtc={expiresAtUtc}
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

          <m.div
            className='relative min-h-0 flex-1'
            style={{
              opacity: contentOpacity,
              pointerEvents: state === 'open' ? 'auto' : 'none'
            }}
          >
            <div
              id='cart-drawer-body'
              aria-busy={removeBusy}
              inert={state !== 'open'}
              className={cn(
                // @container so ticket rows size against the drawer, not the viewport.
                '@container h-full overflow-y-auto px-4 pb-8 transition-opacity',
                removeBusy && 'pointer-events-none opacity-50'
              )}
            >
              {removeError && (
                <p
                  role='alert'
                  className='text-ui-meta text-subtle intent-danger'
                >
                  {removeError}
                </p>
              )}
              {detailsError ? (
                <p
                  className='text-prose text-subtle intent-danger'
                  role='status'
                >
                  Couldn&apos;t load your cart. Please try again.
                </p>
              ) : isEmpty ? (
                <div className='grid min-h-full place-content-center'>
                  <CartEmptyState
                    browseHref={effectiveBrowseHref}
                    onNavigate={onNavigate}
                  />
                </div>
              ) : details ? (
                <CartContents
                  cart={details}
                  onNavigate={onNavigate}
                  browseHref={effectiveBrowseHref}
                  checkoutUrl={checkoutUrl}
                  locale={locale}
                  currency={currency}
                  container='drawer'
                  onRemoveEvent={removeEvent}
                  busy={removeBusy}
                />
              ) : detailsLoading ? (
                <div className='grid gap-4' data-testid='cart-drawer-loading'>
                  <div className='h-4 w-40 animate-pulse rounded bg-subtle' />
                  <div className='h-32 w-full animate-pulse rounded-xl bg-subtle' />
                  <div className='h-32 w-full animate-pulse rounded-xl bg-subtle' />
                </div>
              ) : null}
            </div>

            {removeBusy && (
              <div
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 grid place-content-center'
              >
                <CircleNotchIcon
                  weight='bold'
                  className='size-6 animate-spin text-subtle'
                />
              </div>
            )}
          </m.div>

          {!isEmpty && (
            <CartDrawerFooter
              cartTotal={displayTotal}
              bookingFees={displayBookingFees}
              locale={locale}
              currency={currency}
              isOpen={state === 'open'}
              progress={dragProgress}
              context={context}
              onToggle={toggle}
              onCheckout={handleCheckout}
              onBrowse={handleBrowse}
              checkoutDisabled={!checkoutUrl}
              onPointerDown={handleDragStart}
              footerRef={setFooterElement}
            />
          )}
        </FocusLock>
      </m.div>
    </LazyMotion>
  )
}
