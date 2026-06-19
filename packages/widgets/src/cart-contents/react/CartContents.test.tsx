import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CartDetails, CartEvent } from '../../cart'
import { CartContents } from './CartContents'

const ticket = { name: 'GA', quantity: 1, priceEach: 20 }

const ev = (over: Partial<CartEvent>): CartEvent => ({
  eventId: 'e',
  eventName: 'E',
  venueName: 'V',
  eventStartAtUtc: '2026-06-15T10:00:00Z',
  eventDateKey: '2026-06-15',
  tickets: [ticket],
  subtotal: 20,
  bookingFees: 2,
  total: 22,
  ...over
})

const details = (events: CartEvent[]): CartDetails => ({
  cartId: 'c1',
  collectionName: 'Festival',
  logoUrl: null,
  cartTotal: events.reduce((s, e) => s + e.total, 0),
  expiresAtUtc: '2026-06-15T00:10:00Z',
  extrasUrl: '/outlet/extras/c1',
  events
})

describe('CartContents', () => {
  it('renders the empty state with browseHref when no tickets', async () => {
    const onNavigate = vi.fn()
    render(
      <CartContents
        cart={details([])}
        onNavigate={onNavigate}
        browseHref='/events'
        checkoutUrl='/outlet/extras/c1'
        locale='en-AU'
        currency='AUD'
      />
    )
    const browse = screen.getByRole('button', { name: /browse events/i })
    fireEvent.click(browse)
    expect(onNavigate).toHaveBeenCalledWith('/events')
  })

  it('renders day groups in venue-local order', () => {
    render(
      <CartContents
        cart={details([
          ev({
            eventId: 'late',
            eventName: 'Late',
            eventDateKey: '2026-06-16',
            eventStartAtUtc: '2026-06-16T01:00:00Z'
          }),
          ev({
            eventId: 'early',
            eventName: 'Early',
            eventDateKey: '2026-06-15',
            eventStartAtUtc: '2026-06-15T09:00:00Z'
          })
        ])}
        onNavigate={vi.fn()}
        browseHref='/events'
        checkoutUrl='/outlet/extras/c1'
        locale='en-AU'
        currency='AUD'
      />
    )
    const headers = screen.getAllByText(/2026/)
    // First header must be the 15th (earlier UTC start), then the 16th.
    expect(headers[0]?.textContent).toMatch(/15/)
    expect(headers[1]?.textContent).toMatch(/16/)
  })

  it('fires onNavigate with the validated checkout URL on checkout', async () => {
    const onNavigate = vi.fn()
    render(
      <CartContents
        cart={details([ev({})])}
        onNavigate={onNavigate}
        browseHref='/events'
        checkoutUrl='https://h.example/outlet/extras/c1'
        locale='en-AU'
        currency='AUD'
      />
    )
    const checkout = screen.getByRole('button', { name: /checkout/i })
    fireEvent.click(checkout)
    expect(onNavigate).toHaveBeenCalledWith(
      'https://h.example/outlet/extras/c1'
    )
  })

  it('disables checkout when the URL is null (unsafe)', () => {
    render(
      <CartContents
        cart={details([ev({})])}
        onNavigate={vi.fn()}
        browseHref='/events'
        checkoutUrl={null}
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled()
  })
})
