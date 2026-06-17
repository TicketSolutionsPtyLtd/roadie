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
  buildBrowseHref,
  createExpiryWatcher,
  deriveBookingFees,
  deriveCartTotal,
  deriveTicketCount,
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
  /**
   * Where the drawer is mounted — decides what the open-state secondary button
   * ("Browse events") does:
   *   - `'event'`      → navigate to the collection page to browse more events.
   *   - `'collection'` → just close the drawer (the collection page is already
   *                      behind it). Default.
   *
   * WHY an enum + internal URL (and NOT a consumer browse callback/href):
   * security. The browse target is built by the PACKAGE from the server-trusted
   * `collectionId` (via `buildBrowseHref`, validated by `isSafeRelativePath`) and
   * routed through `onNavigate`. A consumer-supplied URL/navigation could be
   * tainted (e.g. a `redirect=` param), turning "Browse events" into an open
   * redirect; keeping construction in the package means `onNavigate` only ever
   * receives a same-origin, collectionId-derived path. The enum also names the
   * supported contexts explicitly and leaves room to add more.
   */
  context?: 'collection' | 'event'
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
  context = 'collection',
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

  const queryClient = useQueryClient()

  const { data: summary } = useCartSummary(cart, collectionId, refreshKey)
  const {
    data: details,
    isLoading: detailsLoading,
    error: detailsError
  } = useCartDetails(cart, collectionId, refreshKey)

  // Remove-event flow state. Non-optimistic: we lock the whole cart body while
  // a single remove is in flight (server is last-writer-wins) and refetch on
  // success. On failure the rows stay put and we surface the thrown error.
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  // Fresh, reactive figures derived from details (falls back to summary before
  // details load) — summary.ticketCount/cartTotal lag a just-added item.
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

  // Pop-in entrance plays once when the drawer first appears. Skip it under
  // prefers-reduced-motion so the drawer simply appears.
  const prefersReducedMotion = useReducedMotion()

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
  useCartBounce(displayTicketCount, fireBounce)

  // Outbound expiry signal for the host (modals + hide are its job). The core
  // watcher fires onExpire once; its latch resets when expiry changes (below).
  const expiresAtUtc = summary?.expiresAtUtc ?? details?.expiresAtUtc
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
      if (e.key !== 'Escape') return
      // A confirm popover is open — let it consume Escape; don't ALSO collapse
      // the whole drawer. Both listeners sit on document and ours was registered
      // first, so it must defer to the inner layer. (Base UI popups carry
      // data-slot="popover-popup".)
      if (document.querySelector('[data-slot="popover-popup"]')) return
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

  // Open-state "Browse events" in `event` context. Routes the package-built,
  // collectionId-derived, validated `effectiveBrowseHref` (never a
  // consumer-supplied URL) through onNavigate — no open-redirect surface.
  const handleBrowse = useCallback(() => {
    onNavigate(effectiveBrowseHref)
  }, [effectiveBrowseHref, onNavigate])

  // Owns the remove flow: lock the cart, await the event removal, refetch the
  // reads, unlock. The read hooks fold refreshKey into their query keys, so we
  // invalidate by PREFIX ([key, collectionId]) to match every refreshKey. On
  // error keep the rows mounted and surface the message. Guard against a second
  // in-flight remove (removeBusy) — single-remove only.
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

  // Render when there's a collection AND at least one data source — a failed
  // summary fetch shouldn't blank a drawer that has working details (mirrors
  // the Vue gate `collectionId && (summary || details)`).
  if (!collectionId) return null
  if (!summary && !details) return null

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

      {/* Drawer — mobile: floating pill when closed → edge-to-edge when open;
         desktop: floating card in both states (static sm: overrides). Height is
         driven by the motion value; the inset + border-radius morph over 300ms
         (disabled mid-drag, like the height transition). A one-shot pop-in
         (opacity/scale/translateY from bottom) plays on first appear unless
         reduced motion is preferred. */}
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
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={cn(
          'fixed z-70 flex flex-col overflow-hidden emphasis-floating',
          'transition-[border-radius,inset] duration-300 ease-out',
          state === 'open'
            ? 'inset-x-0 bottom-0 rounded-t-4xl'
            : 'inset-x-3 bottom-3 rounded-3xl',
          'sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-[600px] sm:rounded-4xl',
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

          {/* Scrollable body — fills space between header and footer. While a
             remove is in flight the whole body is locked (aria-busy, dimmed,
             pointer-events off) and a spinner overlay sits centered on top. */}
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
                'h-full overflow-y-auto px-4 transition-opacity',
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
              ) : details ? (
                <CartContents
                  cart={details}
                  onNavigate={onNavigate}
                  browseHref={effectiveBrowseHref}
                  checkoutUrl={checkoutUrl}
                  locale={locale}
                  currency={currency}
                  hideFooter
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
        </FocusLock>
      </m.div>
    </LazyMotion>
  )
}
