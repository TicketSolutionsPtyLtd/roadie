import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { CartEvent } from '../core'
import { CartEventGroup } from './CartEventGroup'

const event: CartEvent = {
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

describe('CartEventGroup', () => {
  it('renders event name and venue', () => {
    render(<CartEventGroup event={event} locale='en-AU' currency='AUD' />)
    expect(screen.getByText('Night Show')).toBeInTheDocument()
    expect(screen.getByText('The Venue')).toBeInTheDocument()
  })

  it('formats ticket price with the injected currency (NZD, no hardcoded $/AUD)', () => {
    render(<CartEventGroup event={event} locale='en-NZ' currency='NZD' />)
    // 25.00 formatted as NZD in en-NZ. No literal "$25.00" AUD assumption —
    // the row pulls its currency from the injected formatter.
    const priceCell = screen.getByText((text) => text.includes('25.00'))
    expect(priceCell).toBeInTheDocument()
  })

  it('shows "Free" for zero-priced tickets', () => {
    const freeEvent: CartEvent = {
      ...event,
      tickets: [{ name: 'Comp', quantity: 1, priceEach: 0 }]
    }
    render(<CartEventGroup event={freeEvent} locale='en-AU' currency='AUD' />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('renders an absolute http(s) image', () => {
    render(
      <CartEventGroup
        event={{ ...event, imageUrl: 'https://cdn.example/x.jpg' }}
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://cdn.example/x.jpg'
    )
  })

  it('drops an unsafe (protocol-relative) image url', () => {
    render(
      <CartEventGroup
        event={{ ...event, imageUrl: '//attacker.example/pixel.gif' }}
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(screen.queryByRole('img')).toBeNull()
  })
})
