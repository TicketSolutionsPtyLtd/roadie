import { fireEvent, render } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'

import type { CartDetails, CartEvent } from '../core'
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
    await fireEvent.click(getByText('Browse Events'))
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
    // 15th must come before 16th.
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
        currency: 'AUD'
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
        currency: 'AUD'
      }
    })
    expect((getByText('Checkout') as HTMLButtonElement).disabled).toBe(true)
  })
})
