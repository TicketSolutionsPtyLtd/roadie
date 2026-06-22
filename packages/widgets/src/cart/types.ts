export interface CartSeat {
  section?: string
  row?: string
  seat: string
}

export interface CartTicket {
  name: string
  quantity: number
  priceEach: number
  seats?: CartSeat[]
}

export interface CartEvent {
  eventId: string
  eventName: string
  venueName: string
  imageUrl?: string
  eventStartAtUtc: string
  eventEndAtUtc?: string
  eventDateKey: string
  eventEndDateKey?: string
  /** Must be an IANA id — Windows ids aren't accepted by `Intl`, convert upstream. */
  eventTimeZone?: string
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
