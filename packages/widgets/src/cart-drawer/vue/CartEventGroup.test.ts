import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import type { CartEvent } from '../core'
import CartEventGroup from './CartEventGroup.vue'

function makeEvent(over: Partial<CartEvent> = {}): CartEvent {
  return {
    eventId: 'e1',
    eventName: 'Night Show',
    venueName: 'The Venue',
    eventStartAtUtc: '2026-06-15T10:00:00Z',
    eventDateKey: '2026-06-15',
    tickets: [{ name: 'GA', quantity: 2, priceEach: 25 }],
    subtotal: 50,
    bookingFees: 5,
    total: 55,
    ...over
  }
}

describe('CartEventGroup', () => {
  it('formats currency with the injected locale + currency (NZD, no hardcoded $ assumption)', () => {
    const { getAllByText } = render(CartEventGroup, {
      props: { event: makeEvent(), locale: 'en-NZ', currency: 'NZD' }
    })
    // 2 x $25 = $50 line total; en-NZ NZD uses "$".
    const totals = getAllByText(/\$50\.00/)
    expect(totals.length).toBeGreaterThan(0)
  })

  it('renders Free for zero-priced tickets', () => {
    const { getByText } = render(CartEventGroup, {
      props: {
        event: makeEvent({
          tickets: [{ name: 'Comp', quantity: 1, priceEach: 0 }]
        }),
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(getByText('Free')).toBeTruthy()
  })

  it('renders the event + venue names', () => {
    const { getByText } = render(CartEventGroup, {
      props: { event: makeEvent(), locale: 'en-AU', currency: 'AUD' }
    })
    expect(getByText('Night Show')).toBeTruthy()
    expect(getByText('The Venue')).toBeTruthy()
  })

  it('renders an absolute http(s) image', () => {
    const { container } = render(CartEventGroup, {
      props: {
        event: makeEvent({ imageUrl: 'https://cdn.example/x.jpg' }),
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/x.jpg'
    )
  })

  it('drops an unsafe (protocol-relative) image url', () => {
    const { container } = render(CartEventGroup, {
      props: {
        event: makeEvent({ imageUrl: '//attacker.example/pixel.gif' }),
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(container.querySelector('img')).toBeNull()
  })
})
