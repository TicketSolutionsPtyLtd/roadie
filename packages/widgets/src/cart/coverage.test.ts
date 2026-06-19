import { describe, expect, it } from 'vitest'

import { formatCurrency } from './format'
import { groupEventsByDay } from './grouping'
import type { CartEvent } from './types'

// Edge cases flagged by review to lock in the coverage gate.

describe('groupEventsByDay edge cases', () => {
  it('returns an empty array for no events', () => {
    expect(groupEventsByDay([])).toEqual([])
  })

  it('handles events with optional fields omitted', () => {
    const event: CartEvent = {
      eventId: 'e1',
      eventName: 'Show',
      venueName: 'Venue',
      eventStartAtUtc: '2026-06-15T09:00:00Z',
      eventDateKey: '2026-06-15',
      tickets: [],
      subtotal: 0,
      bookingFees: 0,
      total: 0
      // imageUrl + eventDateDisplay intentionally omitted
    }
    const groups = groupEventsByDay([event])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.events[0]?.imageUrl).toBeUndefined()
  })
})

describe('formatCurrency edge cases', () => {
  it('formats zero', () => {
    expect(formatCurrency(0, { locale: 'en-AU', currency: 'AUD' })).toContain(
      '0.00'
    )
  })

  it('formats negative amounts', () => {
    const out = formatCurrency(-5, { locale: 'en-AU', currency: 'AUD' })
    expect(out).toContain('5.00')
    expect(out).toContain('-')
  })

  it('includes thousands separators for large amounts', () => {
    expect(
      formatCurrency(1234.5, { locale: 'en-AU', currency: 'AUD' })
    ).toContain('1,234.50')
  })
})
