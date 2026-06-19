import type {
  CartClient,
  CartDetails,
  CartEvent,
  CartSeat,
  CartSummary
} from '@oztix/roadie-widgets/cart-drawer/core'

// Canned cart for the live CartDrawer examples. No network — every method
// resolves instantly from in-memory data. `createDemoCart()` returns a fresh,
// independently mutable client (plus a demo-only `addEvent`) so each mounted
// example owns its state. Placeholder images come from picsum.photos because
// the drawer only renders http(s) image URLs — data URIs are rejected by its
// `isSafeImageUrl` guard.

const img = (seed: string) => `https://picsum.photos/seed/${seed}/160/160`

const DEMO_EVENTS: CartEvent[] = [
  {
    eventId: 'e1',
    eventName: 'Sunset Sessions — Opening Night',
    venueName: 'Riverlight Garden Stage, Bulimba',
    imageUrl: img('sunset-sessions'),
    eventStartAtUtc: '2026-09-18T09:00:00Z',
    eventEndAtUtc: '2026-09-18T13:00:00Z',
    eventDateKey: '2026-09-18',
    tickets: [{ name: 'General Admission', quantity: 2, priceEach: 68.5 }],
    subtotal: 137,
    bookingFees: 11,
    total: 148
  },
  {
    eventId: 'e3',
    eventName: 'Riverside Late Show',
    venueName: 'West End Warehouse, Brisbane',
    imageUrl: img('riverside-late'),
    eventStartAtUtc: '2026-09-18T11:00:00Z',
    eventEndAtUtc: '2026-09-18T13:30:00Z',
    eventDateKey: '2026-09-18',
    tickets: [{ name: 'General Admission', quantity: 2, priceEach: 55 }],
    subtotal: 110,
    bookingFees: 10,
    total: 120
  },
  {
    eventId: 'e2',
    eventName: 'Twilight River Weekender',
    venueName: 'Kangaroo Point Lawn, Brisbane',
    imageUrl: img('riverstage'),
    eventStartAtUtc: '2026-10-03T08:30:00Z',
    eventEndAtUtc: '2026-10-04T11:00:00Z',
    eventDateKey: '2026-10-03',
    eventEndDateKey: '2026-10-04',
    tickets: [{ name: 'Weekend Pass', quantity: 1, priceEach: 89.5 }],
    subtotal: 89.5,
    bookingFees: 10,
    total: 99.5
  }
]

// Helper to keep the seat fixtures terse: range('Stalls', 'B', 11, 12).
function range(
  section: string | undefined,
  row: string | undefined,
  from: number,
  to: number
): CartSeat[] {
  const seats: CartSeat[] = []
  for (let n = from; n <= to; n++) seats.push({ section, row, seat: `${n}` })
  return seats
}

type TicketLine = {
  name: string
  quantity: number
  priceEach: number
  seats?: CartSeat[]
}

type EventTemplate = {
  eventName: string
  venueName: string
  seed: string
  eventStartAtUtc: string
  eventEndAtUtc?: string
  eventDateKey: string
  eventEndDateKey?: string
  tickets: TicketLine[]
}

// Cycled through by `addEvent` so repeated clicks add distinct events — a mix of
// single/multi ticket types, single-day finish times, multi-day runs
// (eventEndDateKey), and reserved seating (ticket.seats). The first entry uses
// long event/venue/ticket names to exercise truncation. Venues are fictional
// Brisbane-area locations.
const EXTRA_EVENTS: EventTemplate[] = [
  {
    eventName: 'Circus The Show! — The Greatest Spectacular on Earth',
    venueName: 'Wynnum Pier Marquee (Wynnum, QLD)',
    seed: 'circus-the-show',
    eventStartAtUtc: '2026-06-25T09:00:00Z',
    eventEndAtUtc: '2026-06-25T13:30:00Z',
    eventDateKey: '2026-06-25',
    tickets: [
      { name: 'General Admission - Adult', quantity: 2, priceEach: 37.75 },
      { name: 'General Admission - Concession', quantity: 2, priceEach: 32.65 }
    ]
  },
  {
    eventName: 'Moonlight Carnival',
    venueName: 'Brookfield Showfield, Brisbane',
    seed: 'lunar-park',
    eventStartAtUtc: '2026-11-20T08:00:00Z',
    eventEndAtUtc: '2026-11-22T12:00:00Z',
    eventDateKey: '2026-11-20',
    eventEndDateKey: '2026-11-22',
    tickets: [{ name: 'Carnival Pass', quantity: 2, priceEach: 74 }]
  },
  {
    eventName: 'Harbourside Jazz',
    venueName: 'Hamilton Wharf Pavilion, Brisbane',
    seed: 'harbourside-jazz',
    eventStartAtUtc: '2026-12-05T09:30:00Z',
    eventEndAtUtc: '2026-12-06T13:00:00Z',
    eventDateKey: '2026-12-05',
    eventEndDateKey: '2026-12-06',
    tickets: [
      {
        // A range with a gap → "Stalls B11–12, 14".
        name: 'Reserved Seat',
        quantity: 3,
        priceEach: 110,
        seats: [
          ...range('Stalls', 'B', 11, 12),
          { section: 'Stalls', row: 'B', seat: '14' }
        ]
      },
      {
        // A single seat with no row → "Booth 4".
        name: 'Premium Booth',
        quantity: 1,
        priceEach: 180,
        seats: [{ section: 'Booth', seat: '4' }]
      }
    ]
  },
  {
    eventName: 'Sunset Cinema',
    venueName: 'New Farm Riverwalk Lawn, Brisbane',
    seed: 'sunset-cinema',
    eventStartAtUtc: '2026-12-19T09:00:00Z',
    eventDateKey: '2026-12-19',
    tickets: [{ name: 'Beanbag Ticket', quantity: 2, priceEach: 39.5 }]
  },
  {
    eventName: 'Festival of Lights',
    venueName: 'Southbank Promenade Green, Brisbane',
    seed: 'festival-of-lights',
    eventStartAtUtc: '2027-01-07T09:00:00Z',
    eventEndAtUtc: '2027-01-09T12:30:00Z',
    eventDateKey: '2027-01-07',
    eventEndDateKey: '2027-01-09',
    tickets: [
      { name: 'General Admission', quantity: 2, priceEach: 65 },
      {
        // Seats across two sections → "Mezzanine M3 · Circle C5".
        name: 'VIP Lounge',
        quantity: 2,
        priceEach: 145,
        seats: [
          { section: 'Mezzanine', row: 'M', seat: '3' },
          { section: 'Circle', row: 'C', seat: '5' }
        ]
      }
    ]
  }
]

// Flat per-ticket booking fee used to derive an added event's fees/total.
const FEE_PER_TICKET = 5

function dedupeSeats(seats: CartSeat[]): CartSeat[] {
  const seen = new Set<string>()
  return seats.filter((s) => {
    const id = `${s.section ?? ''}|${s.row ?? ''}|${s.seat}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

// Merge ticket lines of the same type (name + price) when an event is re-added.
// Reserved lines combine their seats into one range (quantity tracks the unique
// seats); GA lines just sum the quantity.
function mergeTickets(
  existing: TicketLine[],
  incoming: TicketLine[]
): TicketLine[] {
  const result = existing.map((ticket) => ({ ...ticket }))
  for (const inc of incoming) {
    const match = result.find(
      (ticket) => ticket.name === inc.name && ticket.priceEach === inc.priceEach
    )
    if (!match) {
      result.push({ ...inc, seats: inc.seats ? [...inc.seats] : undefined })
    } else if (inc.seats?.length || match.seats?.length) {
      match.seats = dedupeSeats([...(match.seats ?? []), ...(inc.seats ?? [])])
      match.quantity = match.seats.length
    } else {
      match.quantity += inc.quantity
    }
  }
  return result
}

const sumTotals = (events: CartEvent[]) =>
  events.reduce((acc, event) => acc + event.total, 0)

const countTickets = (events: CartEvent[]) =>
  events.reduce(
    (acc, event) =>
      acc + event.tickets.reduce((n, ticket) => n + ticket.quantity, 0),
    0
  )

/** The demo client plus helpers the examples call (not part of the real
 * `CartClient` contract — adding to cart and the expiry clock are server-side
 * concerns in real apps). */
export type DemoCartClient = CartClient & {
  /** Append an event with one or more ticket types. */
  addEvent: () => void
  /** Shift the urgency countdown by whole minutes (can go negative). */
  adjustExpiry: (deltaMinutes: number) => void
}

export function createDemoCart(): DemoCartClient {
  // 8 minutes out so the urgency countdown is visible but not alarming.
  let expiresAtUtc = new Date(Date.now() + 8 * 60 * 1000).toISOString()
  let events = DEMO_EVENTS.map((event) => ({ ...event }))
  let added = 0

  return {
    getSummary: async (): Promise<CartSummary> => ({
      cartId: 'demo',
      ticketCount: countTickets(events),
      cartTotal: sumTotals(events),
      expiresAtUtc,
      eventIds: events.map((event) => event.eventId)
    }),
    getDetails: async (): Promise<CartDetails> => ({
      cartId: 'demo',
      collectionName: 'Roadie Festival',
      logoUrl: null,
      cartTotal: sumTotals(events),
      expiresAtUtc,
      extrasUrl: '/checkout/demo',
      events: events.map((event) => ({ ...event }))
    }),
    checkoutUrl: (details) => details.extrasUrl,
    removeItem: async (_cartId, eventId) => {
      events = events.filter((event) => event.eventId !== eventId)
    },
    addEvent: () => {
      const template = EXTRA_EVENTS[added % EXTRA_EVENTS.length]!
      added += 1
      // Stable per-event id so re-adding the same event combines into one entry
      // (e.g. two adds of GA ×2 → one event with GA ×4) instead of duplicating.
      const eventId = `added-${template.seed}`
      const current = events.find((event) => event.eventId === eventId)
      const tickets = mergeTickets(
        current ? current.tickets : [],
        template.tickets
      )
      const subtotal = tickets.reduce(
        (acc, ticket) => acc + ticket.priceEach * ticket.quantity,
        0
      )
      const quantity = tickets.reduce((acc, ticket) => acc + ticket.quantity, 0)
      const merged: CartEvent = {
        eventId,
        eventName: template.eventName,
        venueName: template.venueName,
        imageUrl: img(template.seed),
        eventStartAtUtc: template.eventStartAtUtc,
        eventEndAtUtc: template.eventEndAtUtc,
        eventDateKey: template.eventDateKey,
        eventEndDateKey: template.eventEndDateKey,
        tickets,
        subtotal,
        bookingFees: quantity * FEE_PER_TICKET,
        total: subtotal + quantity * FEE_PER_TICKET
      }
      events = current
        ? events.map((event) => (event.eventId === eventId ? merged : event))
        : [...events, merged]
    },
    adjustExpiry: (deltaMinutes) => {
      expiresAtUtc = new Date(
        new Date(expiresAtUtc).getTime() + deltaMinutes * 60 * 1000
      ).toISOString()
    }
  }
}
