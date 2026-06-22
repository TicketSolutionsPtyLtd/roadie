---
'@oztix/roadie-widgets': minor
---

Cart widgets: standalone **CartContents**, a controllable **CartDrawer**, richer
event data, and Vue parity. All changes are additive and backward-compatible.

**New standalone CartContents widget**

- New `@oztix/roadie-widgets/cart-contents/react` and `.../vue` export
  `CartContents` — the day-grouped event/ticket list (sticky day headers, event
  images, reserved-seat range badges, per-event remove with animated exit) — plus
  (React) `CartContentsProps` and the `CartDetails` / `CartEvent` / `CartTicket`
  / `CartSeat` types. Pulls in only the list (no overlay, drag, focus-trap, or
  expiry code).
- `CartContents` is now the canonical home of the list and `CartDrawer` composes
  it (the drawer depends on cart-contents, never the reverse — no duplication).
- A `container` prop picks the layout preset: `drawer` (default) is the body-only
  list; `page` is the full standalone `/cart` experience — a fill-height column
  with a **Cart** header (ticket count + live expiry), a sticky edge-to-edge
  footer, and a centred empty state. Give the parent a height (e.g.
  `<div className="min-h-full">`); no external `flex-1` / `mt-auto` /
  `justify-center` needed.
- Removing the last event animates (list crossfades to the empty state through
  one presence tree). The footer (`CartFooter`) and `CartUrgencyBadge` are shared
  internal components, so the page and drawer keep identical spacing.

**CartDrawer**

- Now controllable: an `open` prop (React + Vue, with `v-model:open` on Vue)
  opens/closes the drawer from anywhere in your UI (e.g. an inline "View cart"
  button), animating with the same spring as a tap. Standard controllable
  pattern — `open` drives it, tap/drag report via `onOpenChange`. Omit `open` for
  the existing uncontrolled behaviour seeded by `initialState`.
- **Event schedules:** events can carry `eventEndAtUtc` (and venue-local
  `eventEndDateKey`) for a finish time (`7pm – 11pm`) or multi-day range
  (`6:30pm – Sun 4 Oct, 9pm`) via shared `formatEventSchedule` / `formatDayShort`
  core helpers.
- **Venue timezone:** an optional `eventTimeZone` (IANA id) renders schedule
  times in venue-local time via the shared `formatTime` helper; omitted = browser
  time as before; an invalid id safely falls back rather than throwing.
- **Reserved seating:** `CartTicket.seats` takes structured `CartSeat[]`
  (section / row / seat); the shared `formatSeatRange` core helper collapses
  consecutive seats into ranges (`Stalls B11–12`, `Mezzanine M3 · Circle C5`),
  rendered as a seat-icon badge. Omit for general admission.
- Same-day events are split by a hairline; event/day-group removals animate;
  the header urgency badge splits into a ticket-count badge plus a countdown that
  animates in/out and hides when empty.
- **Vue skin animation parity** with React: height springs via `motion` (open/
  close, drag), surface pop-in and empty-close fades, and the remove-confirm
  dialog animate to match; reduced motion gates the ticket bounce. The Vue skin
  now imports `motion` — install it alongside the other Vue peers.

**Shared core + CSS**

- New `@oztix/roadie-widgets/cart` — the framework-agnostic core (types,
  `createCartClient`, formatters) promoted out of the cart-drawer folder.
  `@oztix/roadie-widgets/cart-drawer/core` still works as a **deprecated**
  re-export (removed in the next major).
- New `@oztix/roadie-widgets/css` — a Tailwind source-registration entry that
  ships its own `@source`, so consumers `@import '@oztix/roadie-widgets/css'`
  instead of hand-writing a `node_modules` path. It registers only the widget
  classes; React consumers also import `@oztix/roadie-components/css` (the React
  skins render Roadie components), Vue consumers don't.
