/** One reserved seat. `formatSeatRange` turns a list into a display range. */
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
  /** Venue IANA timezone (e.g. `Australia/Brisbane`). When present, the schedule
   * row's times render in the VENUE's local time rather than the viewer's
   * browser timezone. Omit to keep the legacy browser-local behaviour.
   * Must be an IANA id — Windows ids ("E. Australia Standard Time") are not
   * accepted by `Intl` and must be converted upstream. */
  eventTimeZone?: string
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
