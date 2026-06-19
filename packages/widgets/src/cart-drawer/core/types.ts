export interface CartTicket {
  name: string
  quantity: number
  priceEach: number
  /** Reserved-seat allocation, e.g. "Stalls B11–12". Omitted for GA tickets. */
  seat?: string
}

export interface CartEvent {
  eventId: string
  eventName: string
  venueName: string
  imageUrl?: string
  /** ISO 8601 UTC — used for ORDERING only. */
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
