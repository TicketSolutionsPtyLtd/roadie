---
'@oztix/roadie-widgets': minor
---

Add a `fillHeight` prop to **CartContents** (React + Vue) for standalone
`/cart`-style pages.

When `fillHeight` is set, the root becomes a fill-height flex column that fills
whatever height its container provides:

- The footer pins to the bottom for short carts via `mt-auto` (no scroll
  overflow required), and composes with `stickyFooter` so long carts stay pinned
  while scrolling.
- The empty state fills and centres in the column.

A consumer can now render the page cart as just
`<div className="min-h-full"><CartContents fillHeight … /></div>` — no external
`flex-1`, `mt-auto`, or conditional `justify-center`.

Also: removing the **last** event now animates — the list and the empty state
are driven through one `AnimatePresence` (`mode="wait"` in React, an out-in
`<Transition>` in Vue) so the list fades out and the empty state fades in,
instead of the empty state snapping in. Non-last removals keep their existing
per-item height-collapse animation.

Additive and backward-compatible: with `fillHeight` unset the layout, empty
state, and the drawer's usage are unchanged.
