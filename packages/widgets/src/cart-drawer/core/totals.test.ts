import { describe, expect, it } from 'vitest'

import { deriveCartTotal, deriveTicketCount } from './totals'
import type { CartDetails, CartSummary } from './types'

const event = (over: Partial<CartDetails['events'][number]>) => ({
  eventId: 'e',
  eventName: 'E',
  venueName: 'V',
  eventStartAtUtc: '2026-06-15T10:00:00Z',
  eventDateKey: '2026-06-15',
  tickets: [],
  subtotal: 0,
  bookingFees: 0,
  total: 0,
  ...over
})

const details = (over: Partial<CartDetails>): CartDetails => ({
  cartId: 'c',
  collectionName: null,
  logoUrl: null,
  cartTotal: 0,
  expiresAtUtc: '2026-06-15T10:00:00Z',
  extrasUrl: '',
  events: [],
  ...over
})

const summary = (over: Partial<CartSummary>): CartSummary => ({
  cartId: 'c',
  ticketCount: 0,
  cartTotal: 0,
  expiresAtUtc: '2026-06-15T10:00:00Z',
  eventIds: [],
  ...over
})

describe('deriveTicketCount', () => {
  it('sums ticket quantities across multiple events from details', () => {
    const d = details({
      events: [
        event({ tickets: [{ name: 'A', quantity: 2, priceEach: 10 }] }),
        event({
          tickets: [
            { name: 'B', quantity: 3, priceEach: 5 },
            { name: 'C', quantity: 1, priceEach: 8 }
          ]
        })
      ]
    })
    expect(deriveTicketCount(d, summary({ ticketCount: 99 }))).toBe(6)
  })

  it('falls back to summary.ticketCount when details is null', () => {
    expect(deriveTicketCount(null, summary({ ticketCount: 4 }))).toBe(4)
  })

  it('returns 0 for empty events', () => {
    expect(deriveTicketCount(details({ events: [] }), null)).toBe(0)
  })

  it('returns 0 when both details and summary are null', () => {
    expect(deriveTicketCount(null, null)).toBe(0)
  })

  it('coerces a malformed quantity to 0 without producing NaN', () => {
    const d = details({
      events: [
        event({
          tickets: [
            {
              name: 'A',
              quantity: undefined as unknown as number,
              priceEach: 1
            },
            { name: 'B', quantity: NaN, priceEach: 1 },
            { name: 'C', quantity: 2, priceEach: 1 }
          ]
        })
      ]
    })
    expect(deriveTicketCount(d, null)).toBe(2)
  })

  it('tolerates a missing events array without throwing', () => {
    const d = details({ events: undefined as unknown as CartDetails['events'] })
    expect(() => deriveTicketCount(d, null)).not.toThrow()
    expect(deriveTicketCount(d, null)).toBe(0)
  })

  it('tolerates a missing tickets array without throwing', () => {
    const d = details({
      events: [
        event({
          tickets:
            undefined as unknown as CartDetails['events'][number]['tickets']
        })
      ]
    })
    expect(() => deriveTicketCount(d, null)).not.toThrow()
    expect(deriveTicketCount(d, null)).toBe(0)
  })
})

describe('deriveCartTotal', () => {
  it('sums per-event subtotals across multiple events from details', () => {
    const d = details({
      events: [event({ subtotal: 25 }), event({ subtotal: 15.5 })]
    })
    expect(deriveCartTotal(d, summary({ cartTotal: 999 }))).toBe(40.5)
  })

  it('falls back to summary.cartTotal when details is null', () => {
    expect(deriveCartTotal(null, summary({ cartTotal: 42 }))).toBe(42)
  })

  it('returns 0 for empty events', () => {
    expect(deriveCartTotal(details({ events: [] }), null)).toBe(0)
  })

  it('returns 0 when both details and summary are null', () => {
    expect(deriveCartTotal(null, null)).toBe(0)
  })

  it('coerces a malformed subtotal to 0 without producing NaN', () => {
    const d = details({
      events: [
        event({ subtotal: undefined as unknown as number }),
        event({ subtotal: NaN }),
        event({ subtotal: 10 })
      ]
    })
    expect(deriveCartTotal(d, null)).toBe(10)
  })

  it('tolerates a missing events array without throwing', () => {
    const d = details({ events: undefined as unknown as CartDetails['events'] })
    expect(() => deriveCartTotal(d, null)).not.toThrow()
    expect(deriveCartTotal(d, null)).toBe(0)
  })
})
