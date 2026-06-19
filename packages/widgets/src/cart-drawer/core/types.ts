/** One reserved seat. The drawer renders these via `formatSeatRange`, which
 * groups by section/row and collapses consecutive seats into a range — so every
 * consumer (and skin) displays seating identically. */
export interface CartSeat {
  /** e.g. "Stalls", "Mezzanine", "Booth". */
  section?: string
  /** Row label, e.g. "B". */
  row?: string
  /** Seat label/number, e.g. "12". */
  seat: string
}

export interface CartTicket {
  name: string
  quantity: number
  priceEach: number
  /** Reserved seats for this line. Omitted for general-admission tickets. */
  seats?: CartSeat[]
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
