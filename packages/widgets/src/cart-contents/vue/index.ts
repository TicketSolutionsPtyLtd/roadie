// Public entry for the standalone CartContents widget (Vue skin).
//
// CartContents (the day-grouped event/ticket list, with seat range badges and
// animated per-event remove) lives here as its own widget; the cart drawer
// composes it. Render it on its own — e.g. a /cart page — with `hide-footer`
// to drop the summary footer.
export { default as CartContents } from './CartContents.vue'

// Re-exported so consumers can type the `cart` prop (and its nested shapes).
export type { CartDetails, CartEvent, CartTicket, CartSeat } from '../../cart'
