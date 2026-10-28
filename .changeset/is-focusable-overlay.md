---
'@oztix/roadie-core': minor
---

Add the `is-focusable-overlay` utility, which draws the focus ring inset on an element's `::after` overlay instead of on the element. Use it on a link whose overlay covers a surface that can't show its own ring, such as a table row, so a line clamp or a clipping cell can't cut the ring. It's still an outline, from the same tokens, so forced colours keep it.
