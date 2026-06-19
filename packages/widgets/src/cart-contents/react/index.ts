// Public entry for the standalone CartContents widget (React skin).
//
// CartContents (the day-grouped event/ticket list, with seat range badges and
// per-event remove) lives here as its own widget; the cart drawer composes it.
// Render it on its own — e.g. a /cart page — with `hideFooter` to drop the
// summary footer. No drawer overlay, drag, focus-trap, or expiry code is pulled
// in by this entry.
export { CartContents } from './CartContents'
export type { CartContentsProps } from './CartContents'

// Re-exported so consumers can type the `cart` prop (and its nested shapes)
// without a second import from the core entry.
export type { CartDetails, CartEvent, CartTicket, CartSeat } from '../../cart'
