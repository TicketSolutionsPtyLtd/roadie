---
"@oztix/roadie-widgets": minor
---

Surface booking fees in the `CartDrawer` footer (both skins). The fees line now
reads **"Incl. $X booking fees. Delivery and refund protection calculated at
checkout"** when the cart carries booking fees, falling back to **"Includes
booking fees. Delivery and refund protection calculated at checkout"** when
there are none — matching the full `CartContents` footer.

The figure is summed client-side from the FRESH per-event `bookingFees` field on
the `/cart` details payload (server: `item.InventoryBookingFee()`), via a new
`deriveBookingFees` core helper. Like `deriveCartTotal`, it reads the computed
per-event value rather than the stored, lag-prone cart total, so the fees line
tracks the cart reactively. No new props are required by consumers — the drawer
derives and renders the line automatically.
