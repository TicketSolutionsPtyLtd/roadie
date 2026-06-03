---
"@oztix/roadie-widgets": patch
---

Stop the cart-drawer grabber painting a focus ring (a circle at the top) when
the drawer is opened by drag or click. The focus trap now targets the dialog
container (`tabindex="-1"`, no outline) on open instead of the first tabbable
element (the drag grabber), matching the standard ARIA-dialog focus pattern.
Keyboard users still tab to the grabber and see its `:focus-visible` ring, so
accessibility is preserved.
