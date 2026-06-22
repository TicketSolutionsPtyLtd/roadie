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
        container='page'
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
        container='page'
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

  it('page container fills height and pins the footer (short cart)', () => {
    const { container } = render(
      <CartContents
        container='page'
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
    const footer = screen.getByText('Subtotal').closest('.border-t')
    expect(footer?.className).toMatch(/mt-auto/)
  })

  it('page container renders a Cart header with the ticket count', () => {
    render(
      <CartContents
        container='page'
        cart={details([
          ev({}),
          ev({ eventId: 'e2', eventDateKey: '2026-06-16' })
        ])}
        onNavigate={vi.fn()}
        browseHref='/events'
        checkoutUrl='/outlet/extras/c1'
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(screen.getByRole('heading', { name: /cart/i })).toBeInTheDocument()
  })

  it('page container centres the empty state', () => {
    const { container } = render(
      <CartContents
        container='page'
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

  it('defaults to the drawer container — no header, footer or fill', () => {
    const { container } = render(
      <CartContents
        cart={details([ev({})])}
        onNavigate={vi.fn()}
        browseHref='/events'
        checkoutUrl='/outlet/extras/c1'
        locale='en-AU'
        currency='AUD'
      />
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toMatch(/\bgrid\b/)
    expect(root.className).not.toMatch(/\bflex\b/)
    expect(screen.queryByRole('heading', { name: /cart/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /checkout/i })).toBeNull()
  })

  it('transitions from the last item to the empty state (single presence tree)', async () => {
    const props = {
      container: 'page' as const,
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
    rerender(<CartContents cart={details([])} {...props} />)
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument()
  })
})
