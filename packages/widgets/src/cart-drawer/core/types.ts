export interface CartTicket {
  name: string
  quantity: number
  priceEach: number
}

export interface CartEvent {
  eventId: string
  eventName: string
  venueName: string
  imageUrl?: string
  /** ISO 8601 UTC — used for ORDERING only. */
  eventStartAtUtc: string
  /** Venue-local YYYY-MM-DD — used for DAY GROUPING (design finding #2). */
  eventDateKey: string
  /** Optional pre-formatted display string. */
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
