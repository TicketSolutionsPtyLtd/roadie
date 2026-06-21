---
'@oztix/roadie-widgets': minor
---

Add a standalone **CartContents** widget (React + Vue), and promote the shared
cart core to its own entry.

- **New `@oztix/roadie-widgets/cart-contents/react` and
  `@oztix/roadie-widgets/cart-contents/vue`** — export `CartContents` (the
  day-grouped event/ticket list: sticky day headers, event images, reserved-seat
  range badges via `formatSeatRange`, per-event remove with animated exit) plus
  (React) `CartContentsProps` and the `CartDetails` / `CartEvent` / `CartTicket`
  / `CartSeat` types. Render it on its own — e.g. a `/cart` page — with
  `hideFooter` to drop the summary footer. The entry pulls in only the list
  (no drawer overlay, drag, focus-trap, or expiry code).
- **CartContents is now the canonical home of the list; `CartDrawer` composes
  it** in both skins (the drawer depends on cart-contents, not the reverse — no
  more duplicated list/footer between the drawer and a standalone page).
- It renders **identically to the drawer body**: an `@container` root so the
  event-image queries resolve standalone, and (React) a self-contained
  `LazyMotion` so removals animate without a drawer ancestor.
- **Footer parity:** the standalone CartContents footer now matches the drawer
  footer — `Subtotal` with an animated `NumberFlow`, a neutral "Browse events"
  secondary, and a strong-accent `Checkout` with the bag icon.
- **New `@oztix/roadie-widgets/cart`** — the shared cart core (types,
  `createCartClient`, formatters) promoted out of the cart-drawer folder since
  both widgets depend on it. `@oztix/roadie-widgets/cart-drawer/core` still
  works as a **deprecated** re-export (removed in the next major).

- **New `@oztix/roadie-widgets/css`** — a Tailwind source-registration entry.
  Add `@import '@oztix/roadie-widgets/css'` next to `@oztix/roadie-core/css` and
  Tailwind scans the compiled widget classes automatically; it ships its own
  `@source` so consumers no longer hand-write a `node_modules` path.

Additive and backward-compatible: existing `cart-drawer/*` entries are
unchanged. CartContents has lighter peers than the full drawer (no
`@tanstack/react-query`, no `react-focus-lock`).
