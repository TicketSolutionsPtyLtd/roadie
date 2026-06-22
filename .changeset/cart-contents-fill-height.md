---
'@oztix/roadie-widgets': minor
---

**CartContents** (React + Vue) gains a `container` prop that picks the whole
layout preset, replacing the finer-grained layout flags:

- `container="drawer"` (default) — body-only list: no header or footer, natural
  height. This is what `CartDrawer` renders.
- `container="page"` — the full standalone `/cart` experience: a fill-height
  column with a **Cart** header (ticket count + live expiry countdown), a sticky
  edge-to-edge footer pinned to the bottom, and a centred empty state. Give the
  parent a height (e.g. `<div className="min-h-full">`) — no external `flex-1` /
  `mt-auto` / `justify-center` needed.

Also: removing the **last** event animates (the list crossfades to the empty
state through one presence tree) and the day-list / footer spacing was tightened
(edge-to-edge footer separator, footer bottom padding).

`CartUrgencyBadge` (ticket count + live expiry) moved from `cart-drawer` into
`cart-contents` so both the drawer header and the page header share it; this is
internal (not a public export). No change to the cart-drawer public API.
