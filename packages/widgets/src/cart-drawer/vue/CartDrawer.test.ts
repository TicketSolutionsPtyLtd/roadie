import { fireEvent, render, waitFor } from '@testing-library/vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'

import type { CartClient, CartDetails, CartSummary } from '../core'
import { buildCheckoutUrl } from '../core'
import CartDrawer from './CartDrawer.vue'
import { lockBodyScroll } from './documentEffects'

// @number-flow/vue is an animated Web Component that jsdom never upgrades, so
// it renders no digit text under test (see CartUrgencyBadge.test.ts). Stub it
// with a plain span that emits the same prefix/value/suffix text so the count
// and total values flowing from the cart payload become assertable.
vi.mock('@number-flow/vue', () => ({
  default: {
    name: 'NumberFlowStub',
    props: ['value', 'prefix', 'suffix', 'format'],
    setup(props: { value: number; prefix?: string; suffix?: string }) {
      return () =>
        h('span', `${props.prefix ?? ''}${props.value}${props.suffix ?? ''}`)
    }
  }
}))

afterEach(() => {
  vi.useRealTimers()
})

const HOST = 'https://h.example'

function makeSummary(over: Partial<CartSummary> = {}): CartSummary {
  return {
    cartId: 'c1',
    ticketCount: 2,
    cartTotal: 50,
    expiresAtUtc: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    eventIds: ['e1'],
    ...over
  }
}

function makeDetails(over: Partial<CartDetails> = {}): CartDetails {
  return {
    cartId: 'c1',
    collectionName: 'Festival',
    logoUrl: null,
    cartTotal: 50,
    expiresAtUtc: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    extrasUrl: '/outlet/extras/c1',
    events: [
      {
        eventId: 'e1',
        eventName: 'Night Show',
        venueName: 'The Venue',
        eventStartAtUtc: '2026-06-15T10:00:00Z',
        eventDateKey: '2026-06-15',
        tickets: [{ name: 'GA', quantity: 2, priceEach: 25 }],
        subtotal: 50,
        bookingFees: 5,
        total: 55
      }
    ],
    ...over
  }
}

function mockCart(over: Partial<CartClient> = {}): CartClient {
  return {
    getSummary: vi.fn(async () => makeSummary()),
    getDetails: vi.fn(async () => makeDetails()),
    checkoutUrl: (details) => buildCheckoutUrl(HOST, details.extrasUrl),
    removeItem: vi.fn(async () => {}),
    ...over
  }
}

const baseProps = {
  collectionId: 'col-1',
  browseHref: '/events',
  locale: 'en-AU',
  currency: 'AUD'
}

describe('CartDrawer (Vue)', () => {
  it('fires onNavigate with the validated checkout URL on checkout', async () => {
    const cart = mockCart()
    const onNavigate = vi.fn()
    const { findByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate }
    })
    await flushPromises()
    const checkout = await findByText('Checkout')
    await fireEvent.click(checkout)
    expect(onNavigate).toHaveBeenCalledWith(`${HOST}/outlet/extras/c1`)
  })

  it('disables checkout when the extrasUrl is unsafe (checkoutUrl null)', async () => {
    const cart = mockCart({
      getDetails: vi.fn(async () =>
        makeDetails({ extrasUrl: 'https://evil.com' })
      )
    })
    const { findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    const checkout = (await findAllByText('Checkout'))[0] as HTMLButtonElement
    await waitFor(() => expect(checkout.disabled).toBe(true))
  })

  it('uses browseHref in the empty state', async () => {
    const cart = mockCart({
      getSummary: vi.fn(async () => makeSummary({ ticketCount: 0 })),
      getDetails: vi.fn(async () => makeDetails({ events: [], cartTotal: 0 }))
    })
    const onNavigate = vi.fn()
    const { findByText } = render(CartDrawer, {
      props: {
        ...baseProps,
        cart,
        onNavigate,
        browseHref: '/my-events',
        initialState: 'open'
      }
    })
    await flushPromises()
    const browse = await findByText('Browse events')
    await fireEvent.click(browse)
    expect(onNavigate).toHaveBeenCalledWith('/my-events')
  })

  it('fires onOpenChange(true) when opened', async () => {
    const cart = mockCart()
    const onOpenChange = vi.fn()
    const { findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn(), onOpenChange }
    })
    await flushPromises()
    const openButtons = await findAllByText('View cart')
    await fireEvent.click(openButtons[0]!)
    await nextTick()
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('refetches when refreshKey is bumped', async () => {
    const cart = mockCart()
    const { rerender } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn(), refreshKey: 0 }
    })
    await flushPromises()
    expect(cart.getSummary).toHaveBeenCalledTimes(1)

    await rerender({ ...baseProps, cart, onNavigate: vi.fn(), refreshKey: 1 })
    await flushPromises()
    expect(cart.getSummary).toHaveBeenCalledTimes(2)
  })

  it('fires onExpire when the countdown reaches expiry', async () => {
    vi.useFakeTimers()
    const cart = mockCart({
      getSummary: vi.fn(async () =>
        makeSummary({ expiresAtUtc: new Date(Date.now() + 2000).toISOString() })
      )
    })
    const onExpire = vi.fn()
    render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn(), onExpire }
    })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(4000)
    expect(onExpire).toHaveBeenCalled()
  })

  it('sets role=dialog + aria-modal when opened (focus-trap dialog semantics)', async () => {
    const cart = mockCart()
    const { container, findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    const drawer = container.querySelector('#cart-drawer')!
    expect(drawer.getAttribute('role')).toBe('region')
    const openButtons = await findAllByText('View cart')
    await fireEvent.click(openButtons[0]!)
    await nextTick()
    expect(drawer.getAttribute('role')).toBe('dialog')
    expect(drawer.getAttribute('aria-modal')).toBe('true')
  })

  it('moves focus into the dialog on open and Escape closes it', async () => {
    const cart = mockCart()
    const { container, findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn(), onOpenChange: vi.fn() }
    })
    await flushPromises()

    const drawer = container.querySelector('#cart-drawer')!
    const openBtn = (await findAllByText('View cart'))[0] as HTMLButtonElement
    openBtn.focus()
    await fireEvent.click(openBtn)
    await flushPromises()
    await nextTick()

    // focus-trap moves focus into the dialog (a tabbable child, or the drawer
    // root via fallbackFocus when jsdom reports nothing tabbable).
    await waitFor(() =>
      expect(drawer.contains(document.activeElement)).toBe(true)
    )

    // Escape deactivates the trap and returns the drawer to the docked region.
    // NOTE: return-focus-to-trigger isn't asserted — this drawer swaps its
    // footer buttons on open, detaching the "Open cart" trigger before close,
    // so focus-trap has no live node to restore to. Worth a follow-up (stable
    // setReturnFocus target) but out of scope for this test.
    await fireEvent.keyDown(document, { key: 'Escape' })
    await flushPromises()
    await nextTick()
    expect(drawer.getAttribute('role')).toBe('region')
  })

  it('does not re-observe header/footer on re-render (stable ref callbacks — no recursive drag freeze)', async () => {
    // Real-browser bug: an inline arrow `:ref="(el) => setHeaderElement(...)"`
    // gets a fresh identity every render, so Vue re-invokes the setter on every
    // render → disconnect()+observe() churns the ResizeObserver, whose write
    // schedules another render → re-observe → a cross-frame loop that freezes
    // the tab (no "Maximum recursive updates" log because it's one render per
    // tick). jsdom has no ResizeObserver, so install a counting mock and assert
    // the setters run once (on mount) and are NOT re-invoked on re-render.
    const observe = vi.fn()
    const disconnect = vi.fn()
    class MockResizeObserver {
      observe = observe
      unobserve = vi.fn()
      disconnect = disconnect
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    try {
      const cart = mockCart()
      const { rerender } = render(CartDrawer, {
        props: { ...baseProps, cart, onNavigate: vi.fn(), refreshKey: 0 }
      })
      await flushPromises()
      const observesAfterMount = observe.mock.calls.length
      expect(observesAfterMount).toBeGreaterThan(0)

      // With unstable inline refs each re-render re-invokes the setters →
      // another observe(); with stable callbacks the count holds.
      for (let i = 1; i <= 5; i++) {
        await rerender({
          ...baseProps,
          cart,
          onNavigate: vi.fn(),
          refreshKey: i
        })
        await flushPromises()
      }

      expect(observe.mock.calls.length).toBe(observesAfterMount)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reports the closed drawer height via onHeightChange and the CSS var', async () => {
    const cart = mockCart()
    const onHeightChange = vi.fn()
    render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn(), onHeightChange }
    })
    await flushPromises()
    expect(onHeightChange).toHaveBeenCalled()
    expect(
      document.documentElement.style.getPropertyValue('--cart-drawer-height')
    ).toMatch(/px$/)
  })

  it('reads count + total from details, not the disagreeing summary', async () => {
    // summary lags details (the stale-summary bug): the fresh /cart payload
    // sums to 2 tickets / 50, while /cart/summary still reports 1 / 25.
    const cart = mockCart({
      getSummary: vi.fn(async () =>
        makeSummary({ ticketCount: 1, cartTotal: 25 })
      ),
      getDetails: vi.fn(async () =>
        makeDetails({
          cartTotal: 25,
          events: [
            {
              eventId: 'e1',
              eventName: 'Night Show',
              venueName: 'The Venue',
              eventStartAtUtc: '2026-06-15T10:00:00Z',
              eventDateKey: '2026-06-15',
              tickets: [{ name: 'GA', quantity: 2, priceEach: 25 }],
              subtotal: 50,
              bookingFees: 5,
              total: 55
            }
          ]
        })
      )
    })
    const { container, findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    const openButtons = await findAllByText('View cart')
    await fireEvent.click(openButtons[0]!)
    await flushPromises()
    await nextTick()

    // Badge count reflects the details sum (2), not summary.ticketCount (1).
    expect(
      container.querySelector('[data-testid="cart-badge-count"]')?.textContent
    ).toBe('2')
    // Header total reflects the per-event subtotal sum (50), not summary's 25.
    expect(
      container.querySelector('[data-testid="cart-header-price"]')?.textContent
    ).toBe('$50')
  })

  it('falls back to summary count + total when details are null', async () => {
    const cart = mockCart({
      getSummary: vi.fn(async () =>
        makeSummary({ ticketCount: 3, cartTotal: 75 })
      ),
      // details never resolve → displays should fall back to summary.
      getDetails: vi.fn(() => new Promise<CartDetails>(() => {}))
    })
    const { container, findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    const openButtons = await findAllByText('View cart')
    await fireEvent.click(openButtons[0]!)
    await flushPromises()
    await nextTick()

    expect(
      container.querySelector('[data-testid="cart-badge-count"]')?.textContent
    ).toBe('3')
    expect(
      container.querySelector('[data-testid="cart-header-price"]')?.textContent
    ).toBe('$75')
  })

  it('event context: "Browse events" navigates to the package-built browse target', async () => {
    const cart = mockCart()
    const onNavigate = vi.fn()
    const { container, findByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate, context: 'event' }
    })
    await flushPromises()
    await nextTick()

    // Event context navigates even from the docked state (no "View cart").
    await fireEvent.click(await findByText('Browse events'))
    expect(onNavigate).toHaveBeenCalledWith('/events')
    expect(container.querySelector('#cart-drawer')?.getAttribute('role')).toBe(
      'region'
    )
  })

  it('collection context: "Browse events" closes the drawer and never navigates', async () => {
    const cart = mockCart()
    const onNavigate = vi.fn()
    const { container, findAllByText, findByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate, context: 'collection' }
    })
    await flushPromises()
    await fireEvent.click((await findAllByText('View cart'))[0]!)
    await flushPromises()
    await nextTick()

    await fireEvent.click(await findByText('Browse events'))
    await nextTick()
    expect(container.querySelector('#cart-drawer')?.getAttribute('role')).toBe(
      'region'
    )
    expect(onNavigate).not.toHaveBeenCalledWith('/events')
  })

  it('footer shows the summed booking fees when the cart has fees', async () => {
    const cart = mockCart()
    const { container } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    await nextTick()
    expect(
      container
        .querySelector('[data-testid="cart-footer-fees"]')
        ?.textContent?.trim()
    ).toBe(
      'Incl. $5.00 booking fees. Delivery and refund protection calculated at checkout.'
    )
  })

  it('footer falls back to a fee-free line when there are no booking fees', async () => {
    const cart = mockCart({
      getDetails: vi.fn(async () =>
        makeDetails({
          events: [
            {
              eventId: 'e1',
              eventName: 'Night Show',
              venueName: 'The Venue',
              eventStartAtUtc: '2026-06-15T10:00:00Z',
              eventDateKey: '2026-06-15',
              tickets: [{ name: 'GA', quantity: 2, priceEach: 25 }],
              subtotal: 50,
              bookingFees: 0,
              total: 50
            }
          ]
        })
      )
    })
    const { container } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    await nextTick()
    expect(
      container
        .querySelector('[data-testid="cart-footer-fees"]')
        ?.textContent?.trim()
    ).toBe(
      'Includes booking fees. Delivery and refund protection calculated at checkout.'
    )
  })

  it('locks body scroll while open', async () => {
    expect(document.body.style.overflow).toBe('')
    const cart = mockCart()
    const { findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    await fireEvent.click((await findAllByText('View cart'))[0]!)
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('removes an event: calls cart.removeItem(cartId, eventId) then refetches', async () => {
    const cart = mockCart()
    const { findByLabelText, findByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    expect(cart.getDetails).toHaveBeenCalledTimes(1)

    await fireEvent.click(await findByLabelText('Remove Night Show'))
    await fireEvent.click(await findByText('Remove'))
    await flushPromises()

    expect(cart.removeItem).toHaveBeenCalledWith('c1', 'e1')
    // Non-optimistic: a successful 204 triggers a refetch (getDetails again).
    expect(cart.getDetails).toHaveBeenCalledTimes(2)
  })

  it('Escape on the confirm popover closes only the popover, not the drawer', async () => {
    const cart = mockCart()
    const {
      container,
      findAllByText,
      findByLabelText,
      findByText,
      queryByText
    } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()
    const drawer = container.querySelector('#cart-drawer')!
    // Open the drawer so its own Escape handler is active.
    await fireEvent.click((await findAllByText('View cart'))[0]!)
    await nextTick()
    expect(drawer.getAttribute('role')).toBe('dialog')
    await fireEvent.click(await findByLabelText('Remove Night Show'))
    await findByText('Remove all tickets for this event?')
    // Escape dismisses the popover but must NOT also close the drawer — the
    // drawer's onKeydown bails via the [data-cart-confirm] guard.
    await fireEvent.keyDown(document, { key: 'Escape' })
    await flushPromises()
    await nextTick()
    expect(queryByText('Remove all tickets for this event?')).toBeNull()
    expect(drawer.getAttribute('role')).toBe('dialog')
  })

  it('locks the cart (aria-busy + spinner) while the remove is in flight', async () => {
    let resolveRemove: (() => void) | undefined
    const cart = mockCart({
      removeItem: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveRemove = resolve
          })
      )
    })
    const { container, findByLabelText, findByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn() }
    })
    await flushPromises()

    const body = container.querySelector('#cart-drawer-body')!
    expect(body.getAttribute('aria-busy')).toBe('false')

    await fireEvent.click(await findByLabelText('Remove Night Show'))
    await fireEvent.click(await findByText('Remove'))
    await nextTick()

    expect(body.getAttribute('aria-busy')).toBe('true')
    expect(
      container.querySelector('[data-testid="cart-remove-spinner"]')
    ).not.toBeNull()

    resolveRemove?.()
    await flushPromises()
    await nextTick()
    expect(body.getAttribute('aria-busy')).toBe('false')
    expect(
      container.querySelector('[data-testid="cart-remove-spinner"]')
    ).toBeNull()
  })

  it('on a failed remove keeps the rows, unlocks, and surfaces the error', async () => {
    const cart = mockCart({
      removeItem: vi.fn(async () => {
        throw new Error('Cart request failed (409)')
      })
    })
    const { container, findByLabelText, findByText, getByText } = render(
      CartDrawer,
      { props: { ...baseProps, cart, onNavigate: vi.fn() } }
    )
    await flushPromises()
    // A failed remove must NOT refetch.
    expect(cart.getDetails).toHaveBeenCalledTimes(1)

    await fireEvent.click(await findByLabelText('Remove Night Show'))
    await fireEvent.click(await findByText('Remove'))
    await flushPromises()
    await nextTick()

    expect(getByText('Cart request failed (409)')).toBeTruthy()
    const body = container.querySelector('#cart-drawer-body')
    expect(body?.getAttribute('aria-busy')).toBe('false')
    expect(cart.getDetails).toHaveBeenCalledTimes(1)
    expect(getByText('Night Show')).toBeTruthy()
  })

  it('keeps body scroll locked when it closes while a modal still holds the lock', async () => {
    expect(document.body.style.overflow).toBe('')
    const cart = mockCart()
    const { container, findAllByText } = render(CartDrawer, {
      props: { ...baseProps, cart, onNavigate: vi.fn(), onOpenChange: vi.fn() }
    })
    await flushPromises()

    await fireEvent.click((await findAllByText('View cart'))[0]!)
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')

    // An expiry modal is also open, holding the lock via the same refcounted
    // helper the modal uses.
    const releaseModal = lockBodyScroll()

    // Close the drawer (Escape). The modal is still open, so background scroll
    // MUST stay locked — the drawer must not stomp the shared lock.
    await fireEvent.keyDown(document, { key: 'Escape' })
    await flushPromises()
    await nextTick()
    expect(container.querySelector('#cart-drawer')?.getAttribute('role')).toBe(
      'region'
    )
    expect(document.body.style.overflow).toBe('hidden')

    releaseModal()
    expect(document.body.style.overflow).toBe('')
  })
})
