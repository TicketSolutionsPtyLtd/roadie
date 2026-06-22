---
'@oztix/roadie-widgets': minor
---

**CartDrawer** can now be controlled. Add an `open` prop (React + Vue, with
`v-model:open` on Vue) to open/close the drawer from anywhere in your UI — e.g.
an inline "View cart" button — animating with the same spring as a tap. It's the
standard controllable pattern: changing `open` drives the drawer, and tap/drag
report back through `onOpenChange`, which you echo into `open`.

Omit `open` for the existing uncontrolled behaviour (tap/drag, seeded by
`initialState`). Additive and backward-compatible.
