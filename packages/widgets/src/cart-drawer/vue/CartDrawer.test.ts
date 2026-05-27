import { fireEvent, render, waitFor } from '@testing-library/vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import type { CartClient, CartDetails, CartSummary } from '../core'
import { buildCheckoutUrl } from '../core'
import CartDrawer from './CartDrawer.vue'

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
    const browse = await findByText('Browse Events')
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
    // Footer "Open cart" button toggles open while closed.
    const openButtons = await findAllByText('Open cart')
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
    const openButtons = await findAllByText('Open cart')
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
    const openBtn = (await findAllByText('Open cart'))[0] as HTMLButtonElement
    openBtn.focus() // keyboard user activates the trigger
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
})
