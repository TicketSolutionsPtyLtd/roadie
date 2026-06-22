import { fireEvent, render } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'

import type { CartDetails, CartEvent } from '../../cart'
import CartContents from './CartContents.vue'

function makeEvent(over: Partial<CartEvent> = {}): CartEvent {
  return {
    eventId: 'e1',
    eventName: 'Show',
    venueName: 'Venue',
    eventStartAtUtc: '2026-06-15T10:00:00Z',
    eventDateKey: '2026-06-15',
    tickets: [{ name: 'GA', quantity: 1, priceEach: 25 }],
    subtotal: 25,
    bookingFees: 2,
    total: 27,
    ...over
  }
}

function makeDetails(over: Partial<CartDetails> = {}): CartDetails {
  return {
    cartId: 'c1',
    collectionName: null,
    logoUrl: null,
    cartTotal: 25,
    expiresAtUtc: new Date(Date.now() + 600000).toISOString(),
    extrasUrl: '/outlet/extras/c1',
    events: [makeEvent()],
    ...over
  }
}

describe('CartContents', () => {
  it('shows the empty state with browseHref when there are no tickets', async () => {
    const onNavigate = vi.fn()
    const { getByText } = render(CartContents, {
      props: {
        cart: makeDetails({ events: [], cartTotal: 0 }),
        onNavigate,
        browseHref: '/my-events',
        checkoutUrl: null,
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    await fireEvent.click(getByText('Browse events'))
    expect(onNavigate).toHaveBeenCalledWith('/my-events')
  })

  it('renders day groups in venue-local order (UTC ordering across days)', () => {
    const events = [
      makeEvent({
        eventId: 'late',
        eventDateKey: '2026-06-16',
        eventStartAtUtc: '2026-06-16T01:00:00Z'
      }),
      makeEvent({
        eventId: 'early',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T09:00:00Z'
      })
    ]
    const { container } = render(CartContents, {
      props: {
        cart: makeDetails({ events }),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    const headers = Array.from(
      container.querySelectorAll('[data-testid="cart-group-title"]')
    ).map((el) => el.textContent ?? '')
    expect(headers).toHaveLength(2)
    expect(headers[0]).toMatch(/15/)
    expect(headers[1]).toMatch(/16/)
  })

  it('fires onNavigate with the checkout URL when the footer Checkout is clicked', async () => {
    const onNavigate = vi.fn()
    const { getByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate,
        browseHref: '/events',
        checkoutUrl: 'https://h.example/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    await fireEvent.click(getByText('Checkout'))
    expect(onNavigate).toHaveBeenCalledWith(
      'https://h.example/outlet/extras/c1'
    )
  })

  it('disables checkout when checkoutUrl is null', () => {
    const { getByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: null,
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    expect((getByText('Checkout') as HTMLButtonElement).disabled).toBe(true)
  })

  it('page container fills height and pins the footer', () => {
    const { container, getByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    const root = container.querySelector('[class*="flex-col"]') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.className).toMatch(/\bflex\b/)
    expect(root.className).toMatch(/min-h-full/)
    const footer = getByText('Subtotal').closest('.border-t')
    expect(footer?.className).toMatch(/mt-auto/)
  })

  it('page container renders a Cart header', () => {
    const { getByRole } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    expect(getByRole('heading', { name: /cart/i })).toBeTruthy()
  })

  it('page container centres the empty state', () => {
    const { container, getByText } = render(CartContents, {
      props: {
        cart: makeDetails({ events: [], cartTotal: 0 }),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: null,
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    expect(container.querySelector('.place-content-center')).not.toBeNull()
    expect(getByText('Your cart is empty')).toBeTruthy()
  })

  it('transitions from the last item to the empty state (single presence tree)', async () => {
    const props = {
      onNavigate: vi.fn(),
      browseHref: '/events',
      checkoutUrl: '/outlet/extras/c1',
      locale: 'en-AU',
      currency: 'AUD',
      container: 'page' as const
    }
    const { getByText, findByText, queryByText, rerender } = render(
      CartContents,
      { props: { ...props, cart: makeDetails() } }
    )
    expect(getByText('Checkout')).toBeTruthy()
    await rerender({
      ...props,
      cart: makeDetails({ events: [], cartTotal: 0 })
    })
    expect(await findByText('Your cart is empty')).toBeTruthy()
    expect(queryByText('Checkout')).toBeNull()
  })

  it('defaults to the drawer container — no footer', () => {
    const { container, queryByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(container.querySelector('.place-content-center')).toBeNull()
    expect(queryByText('Checkout')).toBeNull()
  })
})
