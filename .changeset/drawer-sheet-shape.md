---
'@oztix/roadie-core': patch
'@oztix/roadie-components': minor
---

Top and bottom drawers now run edge to edge on a phone and, from `sm` up, stop
at `max-w-xl`, centred, floating `--spacing(2)` off their edge with every
corner rounded: the same shape as the cart drawer. Remove any width, margin or
radius classes an app added to get this.

`Drawer.Body` now scrolls in `ScrollArea`, so drawers use Roadie's scrollbar.
It is still Base UI's drawer content, so a drag in a scrolled body scrolls it
rather than dismissing. A `className` on it still styles the content, as
before.

Core's `motion-drawer` reads `--drawer-float`, so a surface held off its edge
slides fully clear.
