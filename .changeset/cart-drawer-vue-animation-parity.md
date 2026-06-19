---
'@oztix/roadie-widgets': patch
---

Cart drawer (Vue skin): bring animation to parity with the React skin.

- Collapsed drawer no longer clips its footer — the scrollable body now shrinks
  to 0 like React (the padded body is wrapped in a padding-less flex child).
- Open/close springs the height via `motion` (same spring as React) instead of
  an instant set behind a CSS transition, so progress ramps smoothly and the
  header, badge, footer, and overlay animate together rather than snapping.
- Surface pop-in and empty-close fade are now `motion`-driven (matching React's
  `initial`/`animate`), and the remove-confirm dialog animates in/out
  (scale + fade) like the React Base UI popover.
- Reduced motion gates the ticket-count bounce; the footer subtotal animates via
  NumberFlow.

The Vue skin now imports `motion` (already a peer dependency) — install it
alongside the other Vue peers (`pnpm add motion`).
