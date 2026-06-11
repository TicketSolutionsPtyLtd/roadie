import type { ReactElement } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CartClient, CartDetails, CartSummary } from '../core'
import { buildCheckoutUrl } from '../core'
import { CartDrawer } from './CartDrawer'

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

function renderDrawer(node: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>
  )
}

describe('CartDrawer', () => {
  it('fires onNavigate with the validated checkout URL on checkout', async () => {
    const cart = mockCart()
    const onNavigate = vi.fn()
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={onNavigate}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
      />
    )
    // Footer Checkout button is always rendered once the summary loads.
    const checkout = await screen.findByRole('button', { name: /checkout/i })
    fireEvent.click(checkout)
    expect(onNavigate).toHaveBeenCalledWith(`${HOST}/outlet/extras/c1`)
  })

  it('disables checkout when the extrasUrl is unsafe (checkoutUrl null)', async () => {
    const cart = mockCart({
      getDetails: vi.fn(async () =>
        makeDetails({ extrasUrl: 'https://evil.com' })
      )
    })
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={vi.fn()}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
      />
    )
    await waitFor(() => expect(cart.getDetails).toHaveBeenCalled())
    const checkout = await screen.findByRole('button', { name: /checkout/i })
    await waitFor(() => expect(checkout).toBeDisabled())
  })

  it('uses browseHref in the empty state', async () => {
    const cart = mockCart({
      getSummary: vi.fn(async () => makeSummary({ ticketCount: 0 })),
      getDetails: vi.fn(async () => makeDetails({ events: [], cartTotal: 0 }))
    })
    const onNavigate = vi.fn()
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={onNavigate}
        browseHref='/my-events'
        locale='en-AU'
        currency='AUD'
        initialState='open'
      />
    )
    // The empty state renders an exact "Browse Events" button (the footer uses
    // lowercase "Browse events" when open — match the empty-state one exactly).
    const browse = await screen.findByRole('button', { name: 'Browse Events' })
    fireEvent.click(browse)
    expect(onNavigate).toHaveBeenCalledWith('/my-events')
  })

  it('fires onOpenChange(true) when opened', async () => {
    const cart = mockCart()
    const onOpenChange = vi.fn()
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={vi.fn()}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
        onOpenChange={onOpenChange}
      />
    )
    // Both the grabber (aria-label) and the footer Button read "Open cart" while
    // closed — both toggle open, so clicking the first fires onOpenChange(true).
    await screen.findAllByRole('button', { name: /open cart/i })
    const openButtons = screen.getAllByRole('button', { name: /open cart/i })
    fireEvent.click(openButtons[0]!)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true))
  })

  it('refetches when refreshKey is bumped', async () => {
    const cart = mockCart()
    const { rerender } = renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={vi.fn()}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
        refreshKey={0}
      />
    )
    await waitFor(() => expect(cart.getSummary).toHaveBeenCalledTimes(1))

    // rerender shares the same QueryClient via the wrapper closure.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    rerender(
      <QueryClientProvider client={client}>
        <CartDrawer
          cart={cart}
          collectionId='col-1'
          onNavigate={vi.fn()}
          browseHref='/events'
          locale='en-AU'
          currency='AUD'
          refreshKey={1}
        />
      </QueryClientProvider>
    )
    await waitFor(() => expect(cart.getSummary).toHaveBeenCalledTimes(2))
  })

  it('fires onExpire when the countdown reaches expiry', async () => {
    vi.useFakeTimers()
    const cart = mockCart({
      getSummary: vi.fn(async () =>
        makeSummary({ expiresAtUtc: new Date(Date.now() + 2000).toISOString() })
      )
    })
    const onExpire = vi.fn()
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={vi.fn()}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
        onExpire={onExpire}
      />
    )
    // Let the summary query resolve under fake timers.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(onExpire).toHaveBeenCalled()
  })

  it('event context: "Browse events" navigates to the package-built browse target', async () => {
    const cart = mockCart()
    const onNavigate = vi.fn()
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={onNavigate}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
        context='event'
      />
    )
    const openButtons = await screen.findAllByRole('button', {
      name: /open cart/i
    })
    fireEvent.click(openButtons[0]!)
    const browse = await screen.findByRole('button', { name: 'Browse events' })
    fireEvent.click(browse)
    // Navigates to the safe, package-resolved browseHref.
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/events'))
  })

  it('collection context: "Browse events" closes the drawer and never navigates', async () => {
    const cart = mockCart()
    const onNavigate = vi.fn()
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={onNavigate}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
        context='collection'
      />
    )
const viewCart = await screen.findByRole('button', { name: /view cart/i })
fireEvent.click(viewCart)
const browse = await screen.findByRole('button', { name: 'Browse events' })
fireEvent.click(browse)
// Closes → the footer reverts to "View cart"; no browse navigation occurs.
await screen.findByRole('button', { name: /view cart/i })
expect(onNavigate).not.toHaveBeenCalledWith('/events')

  it('footer shows the summed booking fees when the cart has fees', async () => {
    // makeDetails has one event with bookingFees: 5 → "Incl. $5.00 booking fees".
    const cart = mockCart()
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={vi.fn()}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(
      await screen.findByText(
        /Incl\. \$5\.00 booking fees\. Delivery and refund protection calculated at checkout/
      )
    ).toBeInTheDocument()
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
    renderDrawer(
      <CartDrawer
        cart={cart}
        collectionId='col-1'
        onNavigate={vi.fn()}
        browseHref='/events'
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(
      await screen.findByText(
        'Includes booking fees. Delivery and refund protection calculated at checkout'
      )
    ).toBeInTheDocument()
  })
})
