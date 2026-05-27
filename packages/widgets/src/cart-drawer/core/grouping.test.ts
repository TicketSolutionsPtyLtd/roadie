import { describe, expect, it } from 'vitest'

import { groupEventsByDay } from './grouping'
import type { CartEvent } from './types'

const ev = (over: Partial<CartEvent>): CartEvent => ({
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

describe('groupEventsByDay', () => {
  it('groups by venue-local eventDateKey, not UTC', () => {
    // 22:00 Sydney on 2026-06-15 is 12:00Z on the 15th, but a 23:30 local
    // event can be next-day UTC — eventDateKey keeps it on the local day.
    const events = [
      ev({
        eventId: 'a',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T13:30:00Z'
      }),
      ev({
        eventId: 'b',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T23:30:00Z'
      })
    ]
    const groups = groupEventsByDay(events)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe('2026-06-15')
    expect(groups[0]?.events.map((e) => e.eventId)).toEqual(['a', 'b'])
  })

  it('splits one UTC instant across AU/NZ venue-local days (finding #2)', () => {
    // Same wall-clock UTC instant, two venues either side of the date line by
    // offset: 13:30Z is 23:30 the 15th in Sydney (+10) but 01:30 the 16th in
    // Auckland (+12). Grouping must follow each venue's eventDateKey, so the
    // two land in DIFFERENT day buckets even though their UTC days match.
    const events = [
      ev({
        eventId: 'akl',
        venueName: 'Auckland',
        eventDateKey: '2026-06-16',
        eventStartAtUtc: '2026-06-15T13:30:00Z'
      }),
      ev({
        eventId: 'syd',
        venueName: 'Sydney',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T13:30:00Z'
      })
    ]
    const groups = groupEventsByDay(events)
    expect(groups.map((g) => g.key)).toEqual(['2026-06-15', '2026-06-16'])
    expect(groups[0]?.events.map((e) => e.eventId)).toEqual(['syd'])
    expect(groups[1]?.events.map((e) => e.eventId)).toEqual(['akl'])
  })

  it('orders groups and events by eventStartAtUtc ascending', () => {
    const events = [
      ev({
        eventId: 'late',
        eventDateKey: '2026-06-16',
        eventStartAtUtc: '2026-06-16T01:00:00Z'
      }),
      ev({
        eventId: 'early',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T09:00:00Z'
      })
    ]
    const groups = groupEventsByDay(events)
    expect(groups.map((g) => g.key)).toEqual(['2026-06-15', '2026-06-16'])
  })
})
