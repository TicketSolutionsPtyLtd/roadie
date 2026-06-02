import type { CartDetails, CartSummary } from './types'

/**
 * Total tickets in the cart. Sourced from the FRESH per-event ticket
 * quantities in the /cart details payload — NOT the backend's stored,
 * lag-prone cart.InventoryQuantity (summary.ticketCount). Falls back to
 * summary only before details have loaded.
 */
export function deriveTicketCount(
  details: CartDetails | null,
  summary: CartSummary | null
): number {
  if (details) {
    return (details.events ?? []).reduce(
      (sum, event) =>
        sum +
        (event.tickets ?? []).reduce(
          (t, ticket) => t + (Number(ticket.quantity) || 0),
          0
        ),
      0
    )
  }
  return summary?.ticketCount ?? 0
}

/**
 * Pre-checkout cart total: tickets incl. booking fees. Summed from the FRESH
 * per-event `subtotal` (server: item.InventoryTotal()) — NOT the stored,
 * lag-prone cart.Total / event.total / summary.cartTotal. Excludes delivery /
 * refund / transaction fees, which the drawer copy defers to checkout. Both
 * skins use this so the header/footer figure is identical and reactive.
 */
export function deriveCartTotal(
  details: CartDetails | null,
  summary: CartSummary | null
): number {
  if (details) {
    return (details.events ?? []).reduce(
      (sum, event) => sum + (Number(event.subtotal) || 0),
      0
    )
  }
  return summary?.cartTotal ?? 0
}
