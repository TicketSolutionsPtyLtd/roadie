import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('fills height and pins the footer to the bottom under fillHeight (short cart)', () => {
    const { container } = render(
      <CartContents
        fillHeight
        cart={details([ev({})])}
        onNavigate={vi.fn()}
        browseHref='/events'
        checkoutUrl='/outlet/extras/c1'
        locale='en-AU'
        currency='AUD'
      />
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toMatch(/\bflex\b/)
    expect(root.className).toMatch(/min-h-full/)
    expect(root.className).toMatch(/flex-col/)
    // Footer pins to the bottom via mt-auto so a short cart's footer sits low
    // without needing scroll overflow.
    const footer = screen.getByText('Subtotal').closest('.border-t')
    expect(footer?.className).toMatch(/mt-auto/)
  })

  it('centres the empty state under fillHeight', () => {
    const { container } = render(
      <CartContents
        fillHeight
        cart={details([])}
        onNavigate={vi.fn()}
        browseHref='/events'
        checkoutUrl={null}
        locale='en-AU'
        currency='AUD'
      />
    )
    const centered = container.querySelector('.place-content-center')
    expect(centered).not.toBeNull()
    expect(
      within(centered as HTMLElement).getByText(/your cart is empty/i)
    ).toBeInTheDocument()
  })

  it('does not fill or centre without fillHeight (drawer-compatible default)', () => {
    const { container } = render(
      <CartContents
        cart={details([])}
        onNavigate={vi.fn()}
        browseHref='/events'
        checkoutUrl={null}
        locale='en-AU'
        currency='AUD'
      />
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toMatch(/grid gap-5/)
    expect(container.querySelector('.place-content-center')).toBeNull()
  })

  it('transitions from the last item to the empty state (single presence tree)', async () => {
    const props = {
      onNavigate: vi.fn(),
      browseHref: '/events',
      checkoutUrl: '/outlet/extras/c1',
      locale: 'en-AU',
      currency: 'AUD',
      onRemoveEvent: vi.fn()
    }
    const { rerender } = render(
      <CartContents cart={details([ev({})])} {...props} />
    )
    expect(
      screen.getByRole('button', { name: /checkout/i })
    ).toBeInTheDocument()
    // Removing the last event empties the cart — the empty state is reached
    // through the same AnimatePresence instead of a short-circuit return.
    rerender(<CartContents cart={details([])} {...props} />)
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument()
  })
})
