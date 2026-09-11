---
"@oztix/roadie-components": minor
---

Add the application-frame primitives: `Navigator`, `Pane`, `List`,
`ScrollArea` and `Drawer`.

`Navigator` is a full-height application frame — a labelled rail on desktop, a
floating tab bar on mobile — that adapts to whether the product has nested
sections and folds overflowing destinations into a "More" pane. `Pane` is a
scrolling column of that frame, with sticky chrome, a collapse-on-scroll header
and a stack position when panes share a screen. `List` is the vertical row
primitive used inside those panes. `ScrollArea` gives any bounded region a
consistent custom scrollbar, and `Drawer` is a surface that slides in from an
edge and swipes away.

`Accordion` now publishes `--content-inset` (16px) and both its trigger and
content read it, so a `List` dropped into `Accordion.Content` lines up with the
trigger without extra padding. Override the variable on the root to change
both at once. In Safari, an open panel whose content changes size, such as a
filtered list, now resizes with it instead of clipping.

The Roadie docs site is the first consumer: its whole navigation is now built
on `Navigator` + `Pane` + `List`.
