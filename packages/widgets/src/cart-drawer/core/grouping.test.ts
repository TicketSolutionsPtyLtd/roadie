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

// Defence-in-depth: the cart payload is untrusted (client.ts trust-seam). A
// consumer that omits the ordering/grouping keys (e.g. an app that doesn't map
// the API's date fields) must still see its items — not a thrown
// "Cannot read properties of undefined (reading 'localeCompare')" that blanks
// the whole list. These assert graceful degradation, never a throw, never a
// dropped item.
describe('groupEventsByDay — resilience to missing date fields', () => {
  it('does not throw and keeps every event when eventStartAtUtc is missing (2+ event crash repro)', () => {
    const events = [
      ev({ eventId: 'a', eventStartAtUtc: undefined }),
      ev({ eventId: 'b', eventStartAtUtc: undefined })
    ]
    let groups: ReturnType<typeof groupEventsByDay> = []
    expect(() => {
      groups = groupEventsByDay(events)
    }).not.toThrow()
    const ids = groups.flatMap((g) => g.events.map((e) => e.eventId))
    expect(ids).toHaveLength(2)
    expect(ids).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('does not throw and keeps every event when eventDateKey is missing', () => {
    const events = [
      ev({ eventId: 'a', eventDateKey: undefined }),
      ev({ eventId: 'b', eventDateKey: undefined })
    ]
    let groups: ReturnType<typeof groupEventsByDay> = []
    expect(() => {
      groups = groupEventsByDay(events)
    }).not.toThrow()
    const ids = groups.flatMap((g) => g.events.map((e) => e.eventId))
    expect(ids).toHaveLength(2)
    expect(ids).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('keeps dated events ordered/grouped correctly and trails the undated ones', () => {
    const events = [
      ev({
        eventId: 'undated',
        eventStartAtUtc: undefined,
        eventDateKey: undefined
      }),
      ev({
        eventId: 'early',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T09:00:00Z'
      }),
      ev({
        eventId: 'late',
        eventDateKey: '2026-06-16',
        eventStartAtUtc: '2026-06-16T01:00:00Z'
      })
    ]
    const groups = groupEventsByDay(events)
    // Dated groups keep their correct ascending order at the front.
    expect(groups.map((g) => g.key).slice(0, 2)).toEqual([
      '2026-06-15',
      '2026-06-16'
    ])
    // No item is dropped.
    const ids = groups.flatMap((g) => g.events.map((e) => e.eventId))
    expect(ids).toHaveLength(3)
    expect(ids).toEqual(expect.arrayContaining(['early', 'late', 'undated']))
    // The undated event trails in the last group.
    expect(
      groups[groups.length - 1]?.events.some((e) => e.eventId === 'undated')
    ).toBe(true)
  })
})
