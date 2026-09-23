---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
---

Add `emphasis` to `Drawer` and `Dialog`: how much the overlay takes over the
page behind it. `normal` dims and blurs the page, `subtle` tints it and leaves
it readable, and `subtler` leaves it clear while a click outside still
dismisses. A small (`size='sm'`) top or bottom drawer defaults to `subtle`,
because it peeks over its page; every other drawer and every dialog defaults
to `normal`.

Core adds `emphasis-overlay-subtle`, and `emphasis-overlay` now drops its blur
under `prefers-reduced-transparency` and carries the `-webkit-` prefix.
