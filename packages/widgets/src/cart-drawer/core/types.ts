export interface CartTicket {
  name: string
  quantity: number
  priceEach: number
  /** Pre-formatted reserved-seat allocation for this line — a single seat or a
   * range, e.g. "B12" or "Stalls B11–12". The consumer formats it from its own
   * seat data (section / row / seat number); the drawer just displays it.
   * Omitted for general-admission tickets. */
  seats?: string
}

export interface CartEvent {
  eventId: string
  eventName: string
  venueName: string
  imageUrl?: string
  /** ISO 8601 UTC start. Drives ordering and, via `formatEventSchedule`, the
   * displayed start time when `eventDateDisplay` isn't supplied. */
  eventStartAtUtc: string
  /** ISO 8601 UTC finish time. Drives a finish time / multi-day end. */
  eventEndAtUtc?: string
  /** Venue-local YYYY-MM-DD — used for DAY GROUPING (design finding #2). */
  eventDateKey: string
  /** Venue-local YYYY-MM-DD of the finish. When it differs from `eventDateKey`
   * the event is multi-day and the end date is shown. */
  eventEndDateKey?: string
  /** Optional pre-formatted display string — overrides the computed schedule. */
  eventDateDisplay?: string
  tickets: CartTicket[]
  subtotal: number
  bookingFees: number
  total: number
}

export interface CartSummary {
  cartId: string
  ticketCount: number
  cartTotal: number
  expiresAtUtc: string
  eventIds: string[]
}

export interface CartDetails {
  cartId: string
  collectionName: string | null
  logoUrl: string | null
  cartTotal: number
  expiresAtUtc: string
  extrasUrl: string
  events: CartEvent[]
}
